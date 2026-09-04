import { Component, signal, computed, inject, OnInit, OnDestroy, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../../common/custom-select/custom-select';
import { CustomCheckboxComponent } from '../../common/custom-checkbox/custom-checkbox';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { OnboardingTourService, TourStep } from '../../../services/onboarding-tour.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { TabLockService } from '../../../services/tab-lock.service';

export interface InstructorMeta {
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI?: string;
  INSTRUCTOR_NAME_ENG?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
  INSTRUCTOR_ORD?: string | number;
}

export interface InstructorItem {
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI?: string;
  INSTRUCTOR_NAME_ENG?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
  INSTRUCTOR_ORD?: string | number;
}

export interface CourseOption {
  COURSE_NO: string;
  COURSE_NAME_THAI: string;
  COURSE_NAME_ENG?: string;
  CREDIT?: number;
}

export interface PairedCourseMeta {
  groupId: number;
  courseNo: string;
  courseNameThai?: string;
  courseNameEng?: string;
  credit?: number;
  startYear?: string;
  stopYear?: string;
  yearLevel?: string;
  semester?: string;
}

export interface ScheduleClassItem {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  COURSE_NO: string;
  DAY_CODE: number;
  TIME_CODE: number;
  ROOM_CODE?: string;
  INSTR_GROUP?: number;
  INSERT_DATE?: string;
  USER_INSERT?: string;
  COURSE_NAME_THAI?: string;
  COURSE_NAME_ENG?: string;
  CREDIT?: number;
  INSTRUCTORS?: InstructorMeta[];
  PAIRED_COURSES?: PairedCourseMeta[];
  HAS_PAIRED_COURSES?: boolean;
  isMoved?: boolean;
  originalDayCode?: number;
  originalTimeCode?: number;
  hasInstructorConflict?: boolean;
  instructorConflictReason?: string;
}

export interface SlotMoveRecord {
  courseNo: string;
  oldDayCode: number;
  oldTimeCode: number;
  newDayCode: number;
  newTimeCode: number;
  instrGroup?: number;
  roomCode?: string;
}

export interface DayConfig {
  code: number;
  label: string;
  shortLabel: string;
  colorClass: string;
}

export interface TimeSlotConfig {
  code: number;
  TIME_CODE: string;
  label: string;
  period: string;
  TIME_START?: string;
  TIME_END?: string;
}

export interface BusyInstructorDetail {
  instructorCode: string;
  instructorName: string;
  courseNo: string;
  courseName?: string;
}

export interface InstructorSlotAvailability {
  dayCode: number;
  timeCode: number;
  dayLabel: string;
  dayShort: string;
  colorClass: string;
  period: string;
  timeLabel?: string;
  isRu30Available?: boolean;
  isBusyInClass?: boolean;
  isAvailable: boolean;
  busyCount: number;
  busyList: BusyInstructorDetail[];
}

export interface MatrixGridCell {
  colspan: number;
  dayCode: number;
  timeCode: number;
  timeCodes: number[];
  timePeriodLabel: string;
  periodRangeLabel: string;
  classes: ScheduleClassItem[];
  primaryClass: ScheduleClassItem | null;
}

export interface DraggedCourseGroup {
  item: ScheduleClassItem;
  courseNo: string;
  dayCode: number;
  instrGroup: any;
  timeCodes: number[];
  duration: number;
  pairedCourseNos: string[];
}

export interface HoveredDropInfo {
  dayCode: number;
  timeCode: number;
  timeCodes: number[];
  isValid: boolean;
  reason?: string;
}

@Component({
  selector: 'app-tab-student-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent, CustomCheckboxComponent],
  templateUrl: './tab-student-schedule.html',
  styleUrl: './tab-student-schedule.css',
})
export class TabStudentScheduleComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  readonly tourService = inject(OnboardingTourService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly tabLockService = inject(TabLockService);

  constructor() {
    effect(() => {
      const inEdit = this.isEditMode();
      const hasPending = this.pendingMoves().length > 0;
      if (inEdit || hasPending) {
        this.tabLockService.lock(
          'กำลังอยู่ในโหมดปรับเปลี่ยนตาราง (Drag & Drop) กรุณากด "ปิดโหมดปรับตาราง" หรือ "บันทึก" ก่อนเปลี่ยนแท็บ'
        );
      } else {
        this.tabLockService.unlock();
      }
    });
  }

  ngOnDestroy(): void {
    this.tabLockService.unlock();
  }

  // Active Year / Semester
  readonly activeYear = signal<string>('');
  readonly activeSemester = signal<string>('');
  readonly yearSemList = signal<{ STUDY_YEAR: string; STUDY_SEMESTER: string; STUDY_ACTIVE: string }[]>([]);
  readonly selectedYearSem = signal<string>('');

  // Room Selection
  readonly availableRooms = signal<SelectOption[]>([]);
  readonly recentRooms = signal<SelectOption[]>([]);
  readonly selectedRoom = signal<string>('');
  readonly isRoomsLoading = signal<boolean>(false);

  // Scheduled Classes for selected Year/Sem/Room
  readonly classList = signal<ScheduleClassItem[]>([]);
  readonly originalClassList = signal<ScheduleClassItem[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Drag & Drop / Edit Mode State
  readonly isEditMode = signal<boolean>(false);
  readonly isSavingMoves = signal<boolean>(false);
  readonly pendingMoves = signal<SlotMoveRecord[]>([]);
  readonly draggedItem = signal<ScheduleClassItem | null>(null);
  readonly draggedGroup = signal<DraggedCourseGroup | null>(null);
  readonly hoveredDropSlot = signal<HoveredDropInfo | null>(null);

  // Card Context Menu
  readonly isContextMenuOpen = signal<boolean>(false);
  readonly contextMenuPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly contextMenuItem = signal<ScheduleClassItem | null>(null);

  // Empty Slot Context Menu (Right click on empty slot to add class at that day/time)
  readonly isEmptySlotMenuOpen = signal<boolean>(false);
  readonly emptySlotContext = signal<{
    dayCode: number;
    timeCode: number;
    dayLabel: string;
    timePeriod: string;
  } | null>(null);

  // Add / Edit Class Modal State
  readonly isEditModalOpen = signal<boolean>(false);
  readonly isAddMode = signal<boolean>(false);
  readonly editingItem = signal<ScheduleClassItem | null>(null);
  readonly editCourseNo = signal<string>('');
  readonly editCourseName = signal<string>('');
  readonly editCourseCredit = signal<number | null>(null);
  readonly isSavingEdit = signal<boolean>(false);
  readonly editFormError = signal<string>('');
  readonly editDayCode = signal<number | null>(1);
  readonly editTimeCodes = signal<number[]>([1]);
  readonly editTimeCode = computed<number | null>(() => {
    const codes = this.editTimeCodes();
    return codes.length > 0 ? codes[0] : null;
  });
  readonly editRoomCode = signal<string>('');
  readonly editInstructorCodes = signal<string[]>([]);
  readonly allInstructors = signal<InstructorItem[]>([]);
  readonly allRoomOptions = signal<SelectOption[]>([]);
  readonly instructorSearch = signal<string>('');
  readonly instructorPickerLimit = signal<number>(40);
  readonly isInstructorsLoading = signal<boolean>(false);

  // Slot Available Instructors State (อาจารย์ที่สามารถสอนได้ในวันและคาบที่เลือก)
  readonly slotAvailableInstructorCodes = signal<Set<string>>(new Set());
  readonly slotInstructorsStatusMap = signal<Record<string, { isAvailable: boolean; status: string; reason: string }>>({});
  readonly isCheckingSlotInstructors = signal<boolean>(false);
  readonly instructorFilterMode = signal<'all' | 'available' | 'busy'>('all');

  readonly hasSelectedSlot = computed<boolean>(() => {
    return this.editDayCode() !== null && this.editTimeCodes().length > 0;
  });

  readonly availableInstructorsCount = computed<number>(() => {
    return this.slotAvailableInstructorCodes().size;
  });

  // Inline Course Search State (for Add Mode)
  readonly inlineSearchQuery = signal<string>('');
  readonly inlineSearchResults = signal<CourseOption[]>([]);
  readonly isInlineSearching = signal<boolean>(false);
  readonly isInlineDropdownOpen = signal<boolean>(false);
  private searchDebounceTimer: any = null;

  readonly courseDisplayValue = computed<string>(() => {
    if (this.isInlineDropdownOpen() && this.inlineSearchQuery()) {
      return this.inlineSearchQuery();
    }
    const no = this.editCourseNo();
    const name = this.editCourseName();
    if (!no) return this.inlineSearchQuery();
    return name ? `${no} : ${name}` : no;
  });

  // Clone Timetable State
  readonly isCloneModalOpen = signal<boolean>(false);
  readonly cloneSourceYear = signal<string>('');
  readonly cloneSourceSemester = signal<string>('1');
  readonly cloneMode = signal<'merge' | 'replace'>('merge');
  readonly isCloning = signal<boolean>(false);
  readonly cloneSemesterOptions: SelectOption[] = [
    { value: '1', label: 'ภาค 1' },
    { value: '2', label: 'ภาค 2' },
    { value: 'S', label: 'ภาคฤดูร้อน (Summer)' },
  ];

  // Instructor Availability Matrix State (Companion Panel in Edit Modal)
  readonly availabilitySlots = signal<InstructorSlotAvailability[]>([]);
  readonly commonFreeSlots = signal<InstructorSlotAvailability[]>([]);
  readonly isAvailabilityLoading = signal<boolean>(false);
  readonly hasRu30Schedule = signal<boolean>(false);

  readonly displayedAvailabilitySlots = computed(() => {
    return this.availabilitySlots().filter((s) => s.dayCode >= 1 && s.dayCode <= 7 && s.timeCode >= 1 && s.timeCode <= 7);
  });

  readonly freeSlotsCount = computed(() => {
    return this.displayedAvailabilitySlots().filter((s) => s.isAvailable).length;
  });

  readonly busySlotsCount = computed(() => {
    return this.displayedAvailabilitySlots().filter((s) => !s.isAvailable).length;
  });

  readonly editPeriodDurationText = computed<string>(() => {
    const codes = [...this.editTimeCodes()].sort((a, b) => a - b);
    if (codes.length === 0) return 'ยังไม่ได้เลือกคาบ';
    const count = codes.length;
    const hours = count * 2;
    const slots = this.timeSlots();
    const firstSlot = slots.find((s) => s.code === codes[0]);
    const lastSlot = slots.find((s) => s.code === codes[codes.length - 1]);
    const start = (firstSlot?.period || '').split('-')[0].trim();
    const end = (lastSlot?.period || '').split('-')[1]?.trim() || '';
    const timeRange = start && end ? ` (${start} - ${end})` : '';

    if (count === 1) {
      return `คาบที่ ${codes[0]}${timeRange} • 1 คาบ (2 ชั่วโมง)`;
    }
    return `คาบที่ ${codes.join(', ')}${timeRange} • รวม ${count} คาบ (${hours} ชั่วโมง)`;
  });


  onEditDayChange(val: any): void {
    this.editDayCode.set(val !== undefined && val !== null ? Number(val) : 1);
    this.fetchSlotAvailableInstructors();
  }

  toggleEditTimeCode(timeCode: number): void {
    const current = [...this.editTimeCodes()];
    const idx = current.indexOf(timeCode);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(timeCode);
    }
    current.sort((a, b) => a - b);
    this.editTimeCodes.set(current);
    this.fetchSlotAvailableInstructors();
  }

  selectConsecutivePeriods(startCode: number, count: number): void {
    const codes: number[] = [];
    for (let i = 0; i < count; i++) {
      const c = startCode + i;
      if (c <= 7) {
        codes.push(c);
      }
    }
    this.editTimeCodes.set(codes);
    this.fetchSlotAvailableInstructors();
  }

  isTimeCodeSelected(code: number): boolean {
    return this.editTimeCodes().includes(code);
  }

  readonly isSelectedSlotAvailableForInstructors = computed<boolean>(() => {
    const instCodes = this.editInstructorCodes();
    const day = this.editDayCode();
    const times = this.editTimeCodes();

    if (instCodes.length === 0 || day === null || times.length === 0) return true;

    const slots = this.availabilitySlots();
    if (this.isAvailabilityLoading() || slots.length === 0) return true;

    const currentCourse = this.editCourseNo().trim().toUpperCase();

    return times.every((t) => {
      const matchedSlot = slots.find((s) => s.dayCode === day && s.timeCode === t);
      if (!matchedSlot) return false;
      if (!matchedSlot.isRu30Available) return false;
      const genuineBusy = (matchedSlot.busyList || []).filter(
        (b) => (b.courseNo || '').trim().toUpperCase() !== currentCourse
      );
      return genuineBusy.length === 0;
    });
  });

  readonly slotUnavailabilityReason = computed<string>(() => {
    const instCodes = this.editInstructorCodes();
    const day = this.editDayCode();
    const times = this.editTimeCodes();
    if (instCodes.length === 0 || day === null || times.length === 0) return '';

    const slots = this.availabilitySlots();
    if (slots.length === 0) return '';

    const currentCourse = this.editCourseNo().trim().toUpperCase();

    const unavailableSlots = times.filter((t) => {
      const matchedSlot = slots.find((s) => s.dayCode === day && s.timeCode === t);
      if (!matchedSlot || !matchedSlot.isRu30Available) return true;
      const genuineBusy = (matchedSlot.busyList || []).filter(
        (b) => (b.courseNo || '').trim().toUpperCase() !== currentCourse
      );
      return genuineBusy.length > 0;
    });

    if (unavailableSlots.length === 0) return '';

    const periodNames = unavailableSlots.map((t) => `คาบที่ ${t}`).join(', ');
    return `มีอาจารย์ไม่สามารถสอนได้ใน ${periodNames} (ไม่อยู่ในเวลาว่างตาม มร.30 หรือติดสอนวิชาอื่น)`;
  });

  // Detail Modal
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly selectedClassDetail = signal<ScheduleClassItem | null>(null);

  // View Mode: 'matrix' (Grid Table) vs 'list'
  readonly viewMode = signal<'matrix' | 'list'>('matrix');

  // Days Config (Mon - Sun: จันทร์ - อาทิตย์)
  readonly daysConfig: DayConfig[] = [
    { code: 1, label: 'วันจันทร์', shortLabel: 'จันทร์', colorClass: 'day-mon' },
    { code: 2, label: 'วันอังคาร', shortLabel: 'อังคาร', colorClass: 'day-tue' },
    { code: 3, label: 'วันพุธ', shortLabel: 'พุธ', colorClass: 'day-wed' },
    { code: 4, label: 'วันพฤหัสบดี', shortLabel: 'พฤหัสบดี', colorClass: 'day-thu' },
    { code: 5, label: 'วันศุกร์', shortLabel: 'ศุกร์', colorClass: 'day-fri' },
    { code: 6, label: 'วันเสาร์', shortLabel: 'เสาร์', colorClass: 'day-sat' },
    { code: 7, label: 'วันอาทิตย์', shortLabel: 'อาทิตย์', colorClass: 'day-sun' },
  ];

  // Default Time Slots (Standard 7 Periods: คาบ 1 - 7)
  readonly timeSlots = signal<TimeSlotConfig[]>([
    { code: 1, TIME_CODE: '1', label: 'คาบที่ 1', period: '07:30 - 09:20' },
    { code: 2, TIME_CODE: '2', label: 'คาบที่ 2', period: '09:30 - 11:20' },
    { code: 3, TIME_CODE: '3', label: 'คาบที่ 3', period: '11:30 - 13:20' },
    { code: 4, TIME_CODE: '4', label: 'คาบที่ 4', period: '13:30 - 15:20' },
    { code: 5, TIME_CODE: '5', label: 'คาบที่ 5', period: '15:30 - 17:20' },
    { code: 6, TIME_CODE: '6', label: 'คาบที่ 6', period: '17:30 - 19:20' },
    { code: 7, TIME_CODE: '7', label: 'คาบที่ 7', period: '19:30 - 21:20' },
  ]);

  // Year/Semester Select Options
  readonly yearSemSelectOptions = computed<SelectOption[]>(() => {
    return this.yearSemList().map((item) => ({
      value: `${item.STUDY_YEAR}_${item.STUDY_SEMESTER}`,
      label: `ปีการศึกษา ${item.STUDY_YEAR} ภาค ${item.STUDY_SEMESTER}`,
      badge: item.STUDY_ACTIVE === '1' ? 'ปัจจุบัน' : undefined,
    }));
  });

  // Helper to normalize room labels without duplicate "ห้อง"
  formatRoomLabel(str: string): string {
    const raw = (str || '').trim();
    if (!raw) return '';
    if (/^ห้อง/i.test(raw)) {
      return raw.replace(/^(ห้อง\s*)+/gi, 'ห้อง ').trim();
    }
    if (/^\d+$/.test(raw)) {
      return `ห้อง ${raw}`;
    }
    return raw;
  }

  // Room Select Options (Sorted and Deduplicated)
  readonly roomSelectOptions = computed<SelectOption[]>(() => {
    const rooms = this.availableRooms().map((r) => ({
      ...r,
      label: this.formatRoomLabel(r.label || r.value),
    }));
    const current = this.selectedRoom();
    const list = [...rooms];
    if (current && !list.some((r) => r.value === current)) {
      list.unshift({
        value: current,
        label: this.formatRoomLabel(current),
        icon: 'meeting_room',
      });
    }
    return list;
  });

  // Edit Form Select Options
  readonly daySelectOptions = computed<SelectOption[]>(() => {
    return this.daysConfig.map((d) => ({
      value: d.code,
      label: d.label,
      badge: d.shortLabel,
    }));
  });

  readonly timeSelectOptions = computed<SelectOption[]>(() => {
    return this.timeSlots().map((t) => ({
      value: t.code,
      label: `คาบที่ ${t.code}`,
      badge: t.period,
    }));
  });

  readonly roomOptionsForEdit = computed<SelectOption[]>(() => {
    const list = this.allRoomOptions().map((r) => ({
      ...r,
      label: this.formatRoomLabel(r.label || r.value),
    }));
    const current = this.editRoomCode().trim();
    if (current && !list.some((r) => r.value === current)) {
      list.unshift({
        value: current,
        label: this.formatRoomLabel(current),
        icon: 'meeting_room',
      });
    }
    return list;
  });

  readonly filteredInstructorsList = computed(() => {
    let list = this.allInstructors();
    const q = this.instructorSearch().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          (i.INSTRUCTOR_CODE || '').toLowerCase().includes(q) ||
          (i.INSTRUCTOR_NAME_THAI || '').toLowerCase().includes(q) ||
          (i.RANK_NAME_THAI_S || '').toLowerCase().includes(q)
      );
    }

    const filterMode = this.instructorFilterMode();
    if (filterMode === 'available' && this.hasSelectedSlot()) {
      list = list.filter((i) => this.slotAvailableInstructorCodes().has((i.INSTRUCTOR_CODE || '').trim()));
    } else if (filterMode === 'busy' && this.hasSelectedSlot()) {
      list = list.filter((i) => !this.slotAvailableInstructorCodes().has((i.INSTRUCTOR_CODE || '').trim()));
    }

    // เมื่อเลือกคาบและวันแล้ว ในโหมด 'all' ให้นำอาจารย์ที่ว่างสอนขึ้นมาแสดงด้านบน เพื่อให้ user เลือกได้สะดวกทันที
    if (this.hasSelectedSlot() && filterMode === 'all') {
      const availSet = this.slotAvailableInstructorCodes();
      list = [...list].sort((a, b) => {
        const aAvail = availSet.has((a.INSTRUCTOR_CODE || '').trim()) ? 1 : 0;
        const bAvail = availSet.has((b.INSTRUCTOR_CODE || '').trim()) ? 1 : 0;
        return bAvail - aAvail;
      });
    }

    return list;
  });

  readonly displayedFilteredInstructors = computed(() => {
    return this.filteredInstructorsList().slice(0, this.instructorPickerLimit());
  });

  readonly selectedInstructorObjects = computed(() => {
    const selectedCodes = new Set(this.editInstructorCodes());
    return this.allInstructors().filter((i) => selectedCodes.has(i.INSTRUCTOR_CODE));
  });

  // Matrix Map: DayCode -> (TimeCode -> ScheduleClassItem[])
  readonly matrixData = computed(() => {
    const classes = this.classList();
    const matrix: Record<number, Record<number, ScheduleClassItem[]>> = {};

    this.daysConfig.forEach((d) => {
      matrix[d.code] = {};
      this.timeSlots().forEach((t) => {
        matrix[d.code][t.code] = [];
      });
    });

    classes.forEach((c) => {
      const day = Number(c.DAY_CODE);
      const time = Number(c.TIME_CODE);
      if (matrix[day] && matrix[day][time]) {
        matrix[day][time].push(c);
      }
    });

    return matrix;
  });

  // Matrix Colspan Grid: DayCode -> MatrixGridCell[] with horizontal stretching across consecutive periods
  readonly matrixGridRows = computed<Record<number, MatrixGridCell[]>>(() => {
    const matrix = this.matrixData();
    const rows: Record<number, MatrixGridCell[]> = {};
    const slots = this.timeSlots();

    this.daysConfig.forEach((d) => {
      const cells: MatrixGridCell[] = [];
      const coveredTimeCodes = new Set<number>();

      for (const t of slots) {
        if (coveredTimeCodes.has(t.code)) {
          continue;
        }

        const classes = matrix[d.code]?.[t.code] || [];
        if (classes.length === 0) {
          cells.push({
            colspan: 1,
            dayCode: d.code,
            timeCode: t.code,
            timeCodes: [t.code],
            timePeriodLabel: t.period,
            periodRangeLabel: `คาบที่ ${t.code}`,
            classes: [],
            primaryClass: null,
          });
        } else {
          const mainClass = classes[0];
          const spannedCodes = [t.code];
          let nextCode = t.code + 1;

          while (true) {
            const nextClasses = matrix[d.code]?.[nextCode] || [];
            const nextMatch = nextClasses.find(
              (c) =>
                c.COURSE_NO === mainClass.COURSE_NO &&
                (mainClass.INSTR_GROUP == null || c.INSTR_GROUP === mainClass.INSTR_GROUP)
            );
            if (nextMatch) {
              spannedCodes.push(nextCode);
              coveredTimeCodes.add(nextCode);
              nextCode++;
            } else {
              break;
            }
          }

          const startSlot = slots.find((s) => s.code === t.code);
          const endSlot = slots.find((s) => s.code === spannedCodes[spannedCodes.length - 1]);
          const startTimeStr = (startSlot?.period || '').split('-')[0].trim();
          const endTimeStr = (endSlot?.period || '').split('-')[1]?.trim() || (endSlot?.period || '').trim();
          const mergedPeriodLabel = startTimeStr && endTimeStr ? `${startTimeStr} - ${endTimeStr}` : (startSlot?.period || '');
          const periodRangeLabel =
            spannedCodes.length > 1
              ? `คาบ ${spannedCodes[0]} - ${spannedCodes[spannedCodes.length - 1]} (${spannedCodes.length * 2} ชม.)`
              : `คาบ ${spannedCodes[0]}`;

          cells.push({
            colspan: spannedCodes.length,
            dayCode: d.code,
            timeCode: t.code,
            timeCodes: spannedCodes,
            timePeriodLabel: mergedPeriodLabel,
            periodRangeLabel: periodRangeLabel,
            classes: classes,
            primaryClass: mainClass,
          });
        }
      }

      rows[d.code] = cells;
    });

    return rows;
  });

  ngOnInit(): void {
    this.loadInitialData();
    setTimeout(() => this.checkAndStartOnboardingTour(false), 500);
  }

  checkAndStartOnboardingTour(force: boolean = false): void {
    const steps: TourStep[] = [
      {
        targetSelector: '.filter-card',
        title: 'เลือกปีการศึกษา และห้องเรียน',
        description: 'เลือกปี/ภาคการศึกษา และค้นหาห้องเรียนจากข้อมูลที่จัดตารางไว้ (RG_SCHEDULE_CLASS) หรือคลิกเลือกห้องที่เพิ่มล่าสุดด้านล่างได้อย่างรวดเร็ว',
        icon: 'meeting_room',
        position: 'bottom',
      },
      {
        targetSelector: '.btn-add-timetable-class, .filter-actions-group .btn-primary',
        title: 'ปุ่มเพิ่มตารางสอน (+)',
        description: 'คลิกปุ่ม (+) เพื่อเปิดหน้าต่างเพิ่มข้อมูลตารางสอนใหม่ โดยสามารถเลือกกระบวนวิชา วัน คาบเวลา ห้องเรียน และอาจารย์ผู้สอน หรือคลิกที่ช่องว่างในตารางโดยตรงได้เช่นกัน',
        icon: 'add_circle',
        position: 'bottom',
      },
      {
        targetSelector: '.grid-control-right .btn-action-edit-mode, .btn-action-edit-mode',
        title: 'โหมดปรับเปลี่ยนตารางสอน (Drag & Drop)',
        description: 'คลิกปุ่มนี้เพื่อเปิดโหมดปรับตาราง ท่านจะสามารถคลิกค้างแล้วลากกล่องวิชาไปวางในวันหรือเวลาอื่นได้อย่างอิสระ จากนั้นกดปุ่มบันทึกการเปลี่ยนแปลง',
        icon: 'drag_indicator',
        position: 'bottom',
      },
      {
        targetSelector: '.schedule-matrix-container, .matrix-table-wrapper',
        title: 'ตารางเมทริกซ์การใช้ห้องเรียน',
        description: 'แสดงตารางสอนแบ่งตามวัน (จันทร์-อาทิตย์) และเวลาเรียน สามารถคลิกที่กล่องวิชาเพื่อเปิดดูรายละเอียดวิชาและรายชื่ออาจารย์ผู้สอนได้',
        icon: 'calendar_view_week',
        position: 'top',
      },
      {
        targetSelector: '.header-actions .btn-action-primary, .header-actions',
        title: 'ส่งออกไฟล์ CSV และพิมพ์ตารางเรียน',
        description: 'สามารถกดพิมพ์ตารางเรียนแบบจัดหน้ากระดาษสวยงาม หรือส่งออกข้อมูลตารางเรียนของห้องนี้เป็นไฟล์ CSV ไปใช้งานต่อได้ทันที',
        icon: 'print',
        position: 'bottom',
      },
    ];
    this.tourService.startTour('student-schedule', steps, force);
  }

  startAddClassModalTour(force: boolean = false): void {
    const initialSelectedCodes = [...this.editInstructorCodes()];
    let autoSelectedForTour = false;

    const availableInstructors = this.allInstructors();
    const hasInstructors = availableInstructors.length > 0;

    const steps: TourStep[] = [
      {
        targetSelector: '.inline-picker-group, .inline-search-wrapper',
        title: '1. ค้นหาและเลือกกระบวนวิชา',
        description: 'พิมพ์รหัสวิชา (เช่น ACC1101) หรือชื่อวิชาในช่องค้นหา หรือคลิกเพื่อเลือกจากรายการวิชาที่เปิดสอนในหลักสูตร',
        icon: 'menu_book',
        position: 'bottom',
      },
      {
        targetSelector: '.form-grid-2',
        title: '2. ระบุวันเรียน และ ห้องเรียน',
        description: 'เลือกวันเรียน และระบุห้องเรียนที่ต้องการจัดสอน โดยระบบจะล็อคห้องเรียนที่ท่านกำลังเปิดอยู่ให้อัตโนมัติ',
        icon: 'meeting_room',
        position: 'bottom',
      },
      {
        targetSelector: '.multi-period-picker-group',
        title: '3. คาบเวลาที่สอน (Multi-Period)',
        description: 'คลิกเลือกคาบเวลาที่ต้องการจัดสอน สามารถเลือกหลายคาบติดกัน หรือคลิกปุ่มทางลัด (1 คาบ 2 ชม., 2 คาบ 4 ชม., 3 คาบ 6 ชม.) ได้อย่างสะดวก',
        icon: 'schedule',
        position: 'top',
      },
      {
        targetSelector: '.form-section:has(.instructor-picker-container), .instructor-picker-container',
        title: '4. เลือกอาจารย์ผู้สอนในคาบนี้',
        description: 'ค้นหาและติ๊กเลือกอาจารย์ผู้สอน (เลือกได้มากกว่า 1 ท่าน) เมื่อเลือกแล้ว ระบบจะดึงตาราง มร.30 มาตรวจเช็คคาบว่างให้อัตโนมัติ',
        icon: 'person_add',
        position: 'top',
        beforeShow: async () => {
          if (this.editInstructorCodes().length === 0 && hasInstructors) {
            autoSelectedForTour = true;
            this.editInstructorCodes.set([availableInstructors[0].INSTRUCTOR_CODE]);
            this.fetchInstructorAvailability();
            await new Promise((r) => setTimeout(r, 250));
          }
        },
      },
      {
        targetSelector: hasInstructors
          ? '.modal-availability-companion-card, .companion-inner-content'
          : '.form-section:has(.instructor-picker-container), .modal-main-form-card',
        title: '5. แผงเวลาว่างของอาจารย์ (Smart Availability)',
        description: hasInstructors
          ? 'เมื่อเลือกอาจารย์ แผงทางขวานี้จะคลี่ออกมาแสดงคาบที่อาจารย์ว่างสอนตาม มร.30 และเช็ควิชาที่ติดสอนให้ทันที สามารถคลิกปุ่ม "เลือก" เพื่อใส่วันและเวลาลงฟอร์มอัตโนมัติ'
          : 'เมื่อเลือกอาจารย์ผู้สอน แผงด้านขวาจะคลี่ออกมาแสดงคาบว่างของอาจารย์ตาม มร.30 ให้อัตโนมัติ',
        icon: 'event_available',
        position: hasInstructors ? 'left' : 'top',
        beforeShow: async () => {
          if (this.editInstructorCodes().length === 0 && hasInstructors) {
            autoSelectedForTour = true;
            this.editInstructorCodes.set([availableInstructors[0].INSTRUCTOR_CODE]);
            this.fetchInstructorAvailability();
          }
          await new Promise((r) => setTimeout(r, 350));
        },
      },
      {
        targetSelector: '.modal-main-form-card .modal-footer .btn-primary, .modal-footer .btn-primary',
        title: '6. บันทึกข้อมูลตารางสอน',
        description: 'เมื่อข้อมูลครบถ้วนและไม่มีข้อขัดแย้ง ให้คลิกปุ่ม "บันทึกข้อมูลตารางสอน" เพื่อนำวิชาลงสู่ตารางสอนทันที',
        icon: 'save',
        position: 'top',
        actionHint: 'แตะที่ใดก็ได้เพื่อเริ่มจัดตารางสอน',
      },
    ];

    const onFinished = () => {
      if (autoSelectedForTour && initialSelectedCodes.length === 0) {
        this.clearInstructorSelection();
      }
    };

    this.tourService.startTour('student_schedule_add_modal_tour_v2', steps, force, onFinished);
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    // 1. Fetch Year/Semesters
    this.http.get<{ success: boolean; results: any[] }>('/api/service/yearsem/list').subscribe({
      next: (res) => {
        if (res && res.success && res.results) {
          this.yearSemList.set(res.results);
          const active = res.results.find((y) => y.STUDY_ACTIVE === '1') || res.results[0];
          if (active) {
            this.activeYear.set(active.STUDY_YEAR);
            this.activeSemester.set(active.STUDY_SEMESTER);
            this.selectedYearSem.set(`${active.STUDY_YEAR}_${active.STUDY_SEMESTER}`);
          }
        }
        this.loadRoomsAndSchedule();
        this.loadTimeSlots();
        this.loadInstructors();
        this.loadAllRoomOptions();
      },
      error: () => {
        this.loadRoomsAndSchedule();
        this.loadTimeSlots();
        this.loadInstructors();
        this.loadAllRoomOptions();
      },
    });
  }

  loadTimeSlots(): void {
    const isSummer = this.activeSemester() === '3' || this.activeSemester().toUpperCase() === 'S';
    const flag = isSummer ? '2' : '1';
    this.http.get<{ success: boolean; results: any[] }>(`/api/service/timetable/times?flag=${flag}`).subscribe({
      next: (res) => {
        if (res && res.success && res.results && res.results.length > 0) {
          const list: TimeSlotConfig[] = res.results
            .filter((r) => Number(r.TIME_CODE || r.code) >= 1 && Number(r.TIME_CODE || r.code) <= 7)
            .map((r) => ({
              code: Number(r.TIME_CODE) || r.code,
              TIME_CODE: String(r.TIME_CODE || r.code),
              label: r.label || `คาบที่ ${r.TIME_CODE}`,
              period: r.period || '',
              TIME_START: r.TIME_START,
              TIME_END: r.TIME_END,
            }));
          if (list.length > 0) {
            this.timeSlots.set(list);
          }
        }
      },
      error: () => {
        // Use default slots
      },
    });
  }

  loadRoomsAndSchedule(): void {
    this.isRoomsLoading.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();
    this.http.get<{ success: boolean; results: { value: string; label: string }[]; recentRooms?: { value: string; label: string }[] }>(`/api/service/timetable/scheduled-rooms?year=${year}&semester=${sem}`).subscribe({
      next: (res) => {
        this.isRoomsLoading.set(false);
        if (res && res.success) {
          const rooms: SelectOption[] = (res.results || []).map((r) => ({
            value: r.value,
            label: this.formatRoomLabel(r.label || r.value),
            icon: 'meeting_room',
          }));
          this.availableRooms.set(rooms);

          const recents: SelectOption[] = (res.recentRooms || []).map((r) => ({
            value: r.value,
            label: this.formatRoomLabel(r.label || r.value),
            icon: 'meeting_room',
          }));
          this.recentRooms.set(recents);

          // If current selected room is not in the list or empty, select the latest added room first
          if (!this.selectedRoom() || !rooms.some((r) => r.value === this.selectedRoom())) {
            if (recents.length > 0) {
              this.selectedRoom.set(recents[0].value);
            } else if (rooms.length > 0) {
              this.selectedRoom.set(rooms[0].value);
            }
          }
        } else {
          this.availableRooms.set([]);
          this.recentRooms.set([]);
        }
        this.loadScheduleForRoom();
      },
      error: () => {
        this.isRoomsLoading.set(false);
        this.loadScheduleForRoom();
      },
    });
  }

  loadScheduleForRoom(): void {
    const room = this.selectedRoom();
    const year = this.activeYear();
    const sem = this.activeSemester();

    if (!room) {
      this.classList.set([]);
      this.originalClassList.set([]);
      this.pendingMoves.set([]);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    let url = `/api/service/timetable/list?year=${year}&semester=${sem}&roomCode=${encodeURIComponent(room)}`;

    this.http.get<{ success: boolean; results: ScheduleClassItem[] }>(url).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.success) {
          const list = (res.results || []).map((item) => ({
            ...item,
            originalDayCode: item.DAY_CODE,
            originalTimeCode: item.TIME_CODE,
            isMoved: false,
          }));
          this.classList.set(list);
          this.originalClassList.set(JSON.parse(JSON.stringify(list)));
          this.pendingMoves.set([]);
        } else {
          this.classList.set([]);
          this.originalClassList.set([]);
          this.pendingMoves.set([]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error('โหลดตารางเรียนไม่สำเร็จ');
      },
    });
  }

  async onYearSemChange(val: string): Promise<void> {
    if (this.isEditMode() && this.pendingMoves().length > 0) {
      const ok = await this.confirmDialogService.confirm({
        title: 'มีการปรับเปลี่ยนที่ยังไม่ได้บันทึก',
        message: 'คุณมีการปรับเปลี่ยนตารางสอนที่ยังไม่ได้บันทึก ต้องการเปลี่ยนปี/ภาคและยกเลิกการปรับเปลี่ยนหรือไม่?',
        confirmText: 'เปลี่ยนและยกเลิกการปรับ',
        cancelText: 'อยู่หน้านี้ต่อ',
        variant: 'warning',
      });
      if (!ok) return;
    }
    this.selectedYearSem.set(val);
    this.isEditMode.set(false);
    this.pendingMoves.set([]);
    if (val) {
      const [year, sem] = val.split('_');
      this.activeYear.set(year);
      this.activeSemester.set(sem);
      this.loadRoomsAndSchedule();
      this.loadTimeSlots();
      this.loadInstructors();
    }
  }

  async onRoomChange(room: string): Promise<void> {
    if (this.isEditMode() && this.pendingMoves().length > 0) {
      const ok = await this.confirmDialogService.confirm({
        title: 'มีการปรับเปลี่ยนที่ยังไม่ได้บันทึก',
        message: 'คุณมีการปรับเปลี่ยนตารางสอนที่ยังไม่ได้บันทึก ต้องการเปลี่ยนห้องและยกเลิกการปรับเปลี่ยนหรือไม่?',
        confirmText: 'เปลี่ยนห้อง',
        cancelText: 'อยู่หน้านี้ต่อ',
        variant: 'warning',
      });
      if (!ok) return;
    }
    this.selectedRoom.set(room);
    this.isEditMode.set(false);
    this.pendingMoves.set([]);
    this.loadScheduleForRoom();
  }

  // ============================================================
  // DRAG AND DROP & EDIT MODE METHODS
  // ============================================================
  async toggleEditMode(): Promise<void> {
    if (this.isEditMode()) {
      if (this.pendingMoves().length > 0) {
        const ok = await this.confirmDialogService.confirm({
          title: 'ยกเลิกการปรับเปลี่ยนตาราง',
          message: 'คุณมีการปรับเปลี่ยนตารางสอนที่ยังไม่ได้บันทึก ต้องการยกเลิกการปรับเปลี่ยนทั้งหมดหรือไม่?',
          confirmText: 'ยกเลิกการปรับเปลี่ยน',
          cancelText: 'แก้ไขต่อ',
          variant: 'warning',
        });
        if (ok) {
          this.cancelEditMode();
        }
      } else {
        this.isEditMode.set(false);
      }
    } else {
      this.isEditMode.set(true);
      this.toastService.info('เปิดโหมดปรับตารางแล้ว', { description: 'คลิกค้างแล้วลากกล่องวิชาเพื่อย้ายคาบ' });
    }
  }

  cancelEditMode(): void {
    this.classList.set(JSON.parse(JSON.stringify(this.originalClassList())));
    this.pendingMoves.set([]);
    this.isEditMode.set(false);
    this.toastService.info('ยกเลิกการแก้ไขแล้ว');
  }

  onDragStart(event: DragEvent, item: ScheduleClassItem, cell?: MatrixGridCell): void {
    if (!this.isEditMode()) return;
    this.draggedItem.set(item);

    // Determine all period timeCodes belonging to this course group
    let groupTimeCodes: number[] = [];
    if (cell && cell.timeCodes && cell.timeCodes.length > 0) {
      groupTimeCodes = [...cell.timeCodes].sort((a, b) => a - b);
    } else {
      const siblings = this.classList().filter(
        (c) =>
          c.COURSE_NO === item.COURSE_NO &&
          Number(c.DAY_CODE) === Number(item.DAY_CODE) &&
          (item.INSTR_GROUP == null || c.INSTR_GROUP === item.INSTR_GROUP)
      );
      groupTimeCodes = Array.from(new Set(siblings.map((c) => Number(c.TIME_CODE)))).sort((a, b) => a - b);
    }

    if (groupTimeCodes.length === 0) {
      groupTimeCodes = [Number(item.TIME_CODE) || 1];
    }

    const pairedNos = (item.PAIRED_COURSES || []).map((p: any) => (p.courseNo || '').trim().toUpperCase());

    const group: DraggedCourseGroup = {
      item,
      courseNo: (item.COURSE_NO || '').trim().toUpperCase(),
      dayCode: Number(item.DAY_CODE),
      instrGroup: item.INSTR_GROUP,
      timeCodes: groupTimeCodes,
      duration: groupTimeCodes.length,
      pairedCourseNos: pairedNos,
    };

    this.draggedGroup.set(group);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          courseNo: group.courseNo,
          dayCode: group.dayCode,
          timeCodes: group.timeCodes,
          instrGroup: group.instrGroup,
        })
      );
    }
  }

  onDragEnd(event: DragEvent): void {
    this.draggedItem.set(null);
    this.draggedGroup.set(null);
    this.hoveredDropSlot.set(null);
  }

  onDragOver(event: DragEvent, dayCode: number, timeCode: number): void {
    if (!this.isEditMode()) return;
    event.preventDefault();

    const group = this.draggedGroup();
    const duration = group ? group.duration : 1;
    const targetTimeCodes: number[] = [];
    for (let i = 0; i < duration; i++) {
      targetTimeCodes.push(timeCode + i);
    }

    // Check if within bounds (period 1 to 7)
    const outOfBounds = timeCode + duration - 1 > 7;

    // Check occupancy of target slots
    let isOccupiedByOther = false;
    let conflictReason = '';

    if (outOfBounds) {
      conflictReason = `เกินคาบที่ 7 (วิชานี้มีความยาว ${duration} คาบ)`;
    } else if (group) {
      const currentClasses = this.classList();
      for (const t of targetTimeCodes) {
        const classesInSlot = currentClasses.filter(
          (c) =>
            Number(c.DAY_CODE) === dayCode &&
            Number(c.TIME_CODE) === t &&
            (c.COURSE_NO || '').trim().toUpperCase() !== group.courseNo &&
            !group.pairedCourseNos.includes((c.COURSE_NO || '').trim().toUpperCase())
        );
        if (classesInSlot.length > 0) {
          isOccupiedByOther = true;
          conflictReason = `คาบที่ ${t} มีวิชา ${classesInSlot[0].COURSE_NO} จัดสอนอยู่แล้ว`;
          break;
        }
      }
    }

    const isValid = !outOfBounds && !isOccupiedByOther;

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isValid ? 'move' : 'none';
    }

    this.hoveredDropSlot.set({
      dayCode,
      timeCode,
      timeCodes: targetTimeCodes,
      isValid,
      reason: conflictReason,
    });
  }

  onDragLeave(event: DragEvent, dayCode: number, timeCode: number): void {
    const current = this.hoveredDropSlot();
    if (current && current.dayCode === dayCode && current.timeCode === timeCode) {
      this.hoveredDropSlot.set(null);
    }
  }

  onDrop(event: DragEvent, targetDayCode: number, targetTimeCode: number): void {
    if (!this.isEditMode()) return;
    event.preventDefault();

    this.hoveredDropSlot.set(null);

    const group = this.draggedGroup();
    let dragged = group?.item || this.draggedItem();

    if (!group && !dragged && event.dataTransfer) {
      try {
        const raw = event.dataTransfer.getData('text/plain');
        if (raw) {
          const parsed = JSON.parse(raw);
          dragged = this.classList().find((c) =>
            c.COURSE_NO === parsed.courseNo &&
            Number(c.DAY_CODE) === Number(parsed.dayCode) &&
            Number(c.TIME_CODE) === Number(parsed.timeCodes?.[0] || parsed.timeCode)
          ) || null;
        }
      } catch {
        // fallback
      }
    }

    if (!dragged) {
      this.draggedItem.set(null);
      this.draggedGroup.set(null);
      return;
    }

    // Determine group timeCodes
    const currentClasses = [...this.classList()];
    const courseNo = (group?.courseNo || dragged.COURSE_NO || '').trim().toUpperCase();
    const oldDay = group ? group.dayCode : Number(dragged.DAY_CODE);
    const instrGroup = group ? group.instrGroup : dragged.INSTR_GROUP;

    let timeCodes = group?.timeCodes;
    if (!timeCodes || timeCodes.length === 0) {
      const siblings = currentClasses.filter(
        (c) =>
          (c.COURSE_NO || '').trim().toUpperCase() === courseNo &&
          Number(c.DAY_CODE) === oldDay &&
          (instrGroup == null || c.INSTR_GROUP === instrGroup)
      );
      timeCodes = Array.from(new Set(siblings.map((c) => Number(c.TIME_CODE)))).sort((a, b) => a - b);
      if (timeCodes.length === 0) {
        timeCodes = [Number(dragged.TIME_CODE) || 1];
      }
    }

    const duration = timeCodes.length;

    // Check bounds: target cannot exceed period 7
    if (targetTimeCode + duration - 1 > 7) {
      this.toastService.warning(
        `ไม่สามารถวางได้: คาบเรียนจะเกินคาบที่ 7 ของตารางสอน (วิชานี้มีความยาว ${duration} คาบติดกัน)`
      );
      this.draggedItem.set(null);
      this.draggedGroup.set(null);
      return;
    }

    // Check if dropped into the exact same starting slot and day
    if (oldDay === targetDayCode && timeCodes[0] === targetTimeCode) {
      this.draggedItem.set(null);
      this.draggedGroup.set(null);
      return;
    }

    const pairedNos = group?.pairedCourseNos || (dragged.PAIRED_COURSES || []).map((p: any) => (p.courseNo || '').trim().toUpperCase());

    // Check occupancy of target slots: MUST ALL BE FREE of other courses!
    for (let i = 0; i < duration; i++) {
      const targetSlotTime = targetTimeCode + i;
      const conflicting = currentClasses.filter(
        (c) =>
          Number(c.DAY_CODE) === targetDayCode &&
          Number(c.TIME_CODE) === targetSlotTime &&
          (c.COURSE_NO || '').trim().toUpperCase() !== courseNo &&
          !pairedNos.includes((c.COURSE_NO || '').trim().toUpperCase())
      );

      if (conflicting.length > 0) {
        const conflictCourses = conflicting.map((c) => c.COURSE_NO).join(', ');
        const dayName = this.getDayLabel(targetDayCode);
        this.toastService.error(
          `ไม่สามารถวางได้: ช่องวัน${dayName} คาบที่ ${targetSlotTime} มีวิชา ${conflictCourses} จัดสอนอยู่แล้ว`,
          {
            description: `วิชานี้ต้องการช่องว่างต่อเนื่องกัน ${duration} คาบ (คาบที่ ${targetTimeCode} - ${targetTimeCode + duration - 1})`,
          }
        );
        this.draggedItem.set(null);
        this.draggedGroup.set(null);
        return;
      }
    }

    // Perform the move for ALL periods in the group
    const moves = [...this.pendingMoves()];

    // Find all class items (and paired courses) belonging to this group across all its periods
    const groupItems = currentClasses.filter(
      (c) =>
        ((c.COURSE_NO || '').trim().toUpperCase() === courseNo ||
          pairedNos.includes((c.COURSE_NO || '').trim().toUpperCase())) &&
        Number(c.DAY_CODE) === oldDay &&
        timeCodes.includes(Number(c.TIME_CODE)) &&
        (instrGroup == null || c.INSTR_GROUP === instrGroup)
    );

    groupItems.forEach((item) => {
      const itemIdx = currentClasses.indexOf(item);
      if (itemIdx === -1) return;

      const oldTime = Number(item.TIME_CODE);
      const periodOffset = timeCodes.indexOf(oldTime);
      const newTime = targetTimeCode + (periodOffset >= 0 ? periodOffset : 0);

      const isMoved = targetDayCode !== item.originalDayCode || newTime !== item.originalTimeCode;

      const updated = {
        ...item,
        DAY_CODE: targetDayCode,
        TIME_CODE: newTime,
        isMoved: isMoved,
        hasInstructorConflict: false,
        instructorConflictReason: undefined,
      };

      currentClasses[itemIdx] = updated;

      // Record move for this period slot
      const existingMoveIdx = moves.findIndex(
        (m) =>
          m.courseNo === item.COURSE_NO &&
          m.oldDayCode === (item.originalDayCode ?? oldDay) &&
          m.oldTimeCode === (item.originalTimeCode ?? oldTime) &&
          (m.instrGroup === item.INSTR_GROUP || !m.instrGroup)
      );

      if (existingMoveIdx >= 0) {
        moves[existingMoveIdx].newDayCode = targetDayCode;
        moves[existingMoveIdx].newTimeCode = newTime;
      } else {
        moves.push({
          courseNo: item.COURSE_NO,
          oldDayCode: item.originalDayCode ?? oldDay,
          oldTimeCode: item.originalTimeCode ?? oldTime,
          newDayCode: targetDayCode,
          newTimeCode: newTime,
          instrGroup: item.INSTR_GROUP,
          roomCode: item.ROOM_CODE || this.selectedRoom(),
        });
      }
    });

    this.classList.set(currentClasses);

    // Filter out moves that ended up back at their original slot
    const finalMoves = moves.filter((m) => m.oldDayCode !== m.newDayCode || m.oldTimeCode !== m.newTimeCode);
    this.pendingMoves.set(finalMoves);

    this.draggedItem.set(null);
    this.draggedGroup.set(null);

    const targetTimeCodes: number[] = [];
    for (let i = 0; i < duration; i++) {
      targetTimeCodes.push(targetTimeCode + i);
    }

    // ตรวจสอบความพร้อมสอนของอาจารย์ทันที (ถ้าถูกย้ายไปยังช่องที่ไม่ใช่ช่องเดิม)
    const isActuallyMoved = groupItems.some(
      (it) => it.originalDayCode !== targetDayCode || it.originalTimeCode !== (targetTimeCode + timeCodes.indexOf(Number(it.TIME_CODE)))
    );

    if (isActuallyMoved) {
      const allInstructors = groupItems.flatMap((g) => g.INSTRUCTORS || []);
      this.validateMovedGroupInstructorAvailability(courseNo, targetDayCode, targetTimeCodes, allInstructors);
    }

    const dayName = this.getDayLabel(targetDayCode);
    const endSlot = targetTimeCode + duration - 1;
    const timeRangeDesc = duration > 1 ? `คาบที่ ${targetTimeCode} - ${endSlot} (${duration} คาบ)` : `คาบที่ ${targetTimeCode}`;
    const pairText = pairedNos.length > 0 ? ` (พร้อมวิชาคู่ ${pairedNos.join(', ')})` : '';

    this.toastService.success(`ย้ายวิชา ${courseNo}${pairText} ทั้งกลุ่มแล้ว`, {
      description: `วัน${dayName} ${timeRangeDesc} • อย่าลืมกดบันทึกเพื่อยืนยัน`,
    });
  }

  validateMovedGroupInstructorAvailability(
    courseNo: string,
    targetDayCode: number,
    targetTimeCodes: number[],
    instructors: InstructorMeta[]
  ): void {
    const instCodes = Array.from(
      new Set(
        (instructors || [])
          .map((i) => (i.INSTRUCTOR_CODE || '').trim())
          .filter(Boolean)
      )
    );

    if (instCodes.length === 0) return;

    const year = this.activeYear();
    const sem = this.activeSemester();
    const codesParam = encodeURIComponent(instCodes.join(','));
    const url = `/api/service/timetable/instructor-availability?year=${year}&semester=${sem}&instructorCodes=${codesParam}&courseNo=${encodeURIComponent(courseNo)}`;

    this.http
      .get<{
        success: boolean;
        hasRu30Schedule?: boolean;
        slots: InstructorSlotAvailability[];
      }>(url)
      .subscribe({
        next: (res) => {
          if (!res || !res.success || !res.slots) return;

          let hasConflict = false;
          let conflictMsg = '';

          for (const t of targetTimeCodes) {
            const slot = res.slots.find(
              (s) => Number(s.dayCode) === Number(targetDayCode) && Number(s.timeCode) === Number(t)
            );

            if (res.hasRu30Schedule) {
              if (!slot || !slot.isAvailable) {
                hasConflict = true;
                if (slot && slot.isBusyInClass) {
                  const busyNames = (slot.busyList || [])
                    .map((b) => `${b.instructorName} (ติดสอน ${b.courseNo})`)
                    .join(', ');
                  conflictMsg = `คาบที่ ${t}: อาจารย์ติดสอนวิชาอื่น (${busyNames})`;
                } else {
                  conflictMsg = `คาบที่ ${t}: ไม่อยู่ในวันและเวลาว่างของอาจารย์ตาม มร.30`;
                }
                break;
              }
            } else if (slot && slot.isBusyInClass) {
              hasConflict = true;
              const busyNames = (slot.busyList || [])
                .map((b) => `${b.instructorName} (ติดสอน ${b.courseNo})`)
                .join(', ');
              conflictMsg = `คาบที่ ${t}: อาจารย์ติดสอนวิชาอื่น (${busyNames})`;
              break;
            }
          }

          // อัปเดตสถานะสีแดงใน classList ทันที
          const updated = this.classList().map((c) => {
            if (
              (c.COURSE_NO || '').trim().toUpperCase() === courseNo.trim().toUpperCase() &&
              Number(c.DAY_CODE) === Number(targetDayCode) &&
              targetTimeCodes.includes(Number(c.TIME_CODE))
            ) {
              return {
                ...c,
                hasInstructorConflict: hasConflict,
                instructorConflictReason: hasConflict ? conflictMsg : undefined,
              };
            }
            return c;
          });
          this.classList.set(updated);

          if (hasConflict) {
            this.toastService.warning('อาจารย์ไม่สามารถสอนในวันและเวลานี้ได้!', {
              description: `วิชา ${courseNo}: ${conflictMsg} (ระบบแสดงการ์ดสีแดงแจ้งเตือน)`,
            });
          }
        },
        error: () => {
          // Silently proceed if check cannot complete
        },
      });
  }

  async savePendingMoves(): Promise<void> {
    const moves = this.pendingMoves();
    if (moves.length === 0) {
      this.toastService.info('ไม่มีรายการเปลี่ยนแปลง');
      return;
    }

    const hasConflicts = this.classList().some((c) => c.isMoved && c.hasInstructorConflict);
    if (hasConflicts) {
      const confirmSave = await this.confirmDialogService.confirm({
        title: 'มีวิชาที่อาจารย์ไม่สามารถสอนได้',
        message:
          'พบวิชาที่วางหรือย้ายไปยังวัน/เวลาที่อาจารย์ติดสอนหรือไม่อยู่ในเวลาว่าง มร.30 (การ์ดสถานะสีแดง) คุณต้องการดำเนินการต่อหรือไม่?',
        confirmText: 'พยายามบันทึก',
        cancelText: 'กลับไปแก้ไข',
        variant: 'danger',
      });
      if (!confirmSave) return;
    }

    this.isSavingMoves.set(true);

    const payload = {
      studyYear: this.activeYear(),
      studySemester: this.activeSemester(),
      moves: moves,
      userInsert: this.authService.currentUser()?.email?.split('@')[0] || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string; updatedCount?: number }>('/api/service/timetable/update-slots', payload).subscribe({
      next: (res) => {
        this.isSavingMoves.set(false);
        if (res && res.success) {
          this.toastService.success('บันทึกการปรับเปลี่ยนตารางสอนสำเร็จ');
          this.pendingMoves.set([]);
          this.isEditMode.set(false);
          this.loadScheduleForRoom();
        } else {
          this.toastService.error(res?.message || 'บันทึกไม่สำเร็จ');
        }
      },
      error: (err) => {
        this.isSavingMoves.set(false);
        this.toastService.error(err?.error?.message || err?.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
      },
    });
  }

  isDropSlotHovered(dayCode: number, timeCode: number): boolean {
    const h = this.hoveredDropSlot();
    return h !== null && h.dayCode === dayCode && h.timeCodes.includes(timeCode) && h.isValid;
  }

  isDropSlotInvalid(dayCode: number, timeCode: number): boolean {
    const h = this.hoveredDropSlot();
    return h !== null && h.dayCode === dayCode && h.timeCodes.includes(timeCode) && !h.isValid;
  }

  getDayLabel(dayCode: number): string {
    const d = this.daysConfig.find((x) => x.code === Number(dayCode));
    return d ? d.shortLabel : `วัน ${dayCode}`;
  }

  getDayColorClass(dayCode: number): string {
    const d = this.daysConfig.find((x) => x.code === Number(dayCode));
    return d ? d.colorClass : 'day-default';
  }

  getTimePeriod(timeCode: number): string {
    const t = this.timeSlots().find((x) => Number(x.code) === Number(timeCode));
    return t ? t.period : `คาบ ${timeCode}`;
  }

  openClassDetail(item: ScheduleClassItem, event?: MouseEvent): void {
    if (this.isEditMode()) return;
    if (event) event.stopPropagation();
    this.selectedClassDetail.set(item);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedClassDetail.set(null);
  }

  printSchedule(): void {
    window.print();
  }

  exportToCsv(): void {
    const classes = this.classList();
    if (classes.length === 0) {
      this.toastService.warning('ไม่มีข้อมูลตารางเรียนสำหรับส่งออก');
      return;
    }

    const headers = [
      'ปีการศึกษา',
      'ภาคการศึกษา',
      'ห้องเรียน',
      'วัน',
      'คาบเวลา',
      'ช่วงเวลา',
      'รหัสวิชา',
      'ชื่อวิชา (ไทย)',
      'ชื่อวิชา (อังกฤษ)',
      'หน่วยกิต',
      'อาจารย์ผู้สอน',
    ];

    const rows = classes.map((c) => {
      const instNames = (c.INSTRUCTORS || [])
        .map((i) => `${i.RANK_NAME_THAI_S || ''} ${i.INSTRUCTOR_NAME_THAI || i.INSTRUCTOR_CODE}`.trim())
        .join('; ');

      return [
        `"${c.STUDY_YEAR || ''}"`,
        `"${c.STUDY_SEMESTER || ''}"`,
        `"${c.ROOM_CODE || this.selectedRoom()}"`,
        `"${this.getDayLabel(c.DAY_CODE)}"`,
        `"คาบที่ ${c.TIME_CODE}"`,
        `"${this.getTimePeriod(c.TIME_CODE)}"`,
        `"${c.COURSE_NO || ''}"`,
        `"${(c.COURSE_NAME_THAI || '').replace(/"/g, '""')}"`,
        `"${(c.COURSE_NAME_ENG || '').replace(/"/g, '""')}"`,
        `"${c.CREDIT != null ? c.CREDIT : ''}"`,
        `"${instNames.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ตารางเรียน_ห้อง_${this.selectedRoom()}_${this.activeYear()}_${this.activeSemester()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toastService.success('ส่งออกไฟล์ CSV สำเร็จ');
  }

  getPairedCoursesTooltip(pairedList?: PairedCourseMeta[]): string {
    if (!pairedList || pairedList.length === 0) return '';
    return pairedList
      .map((p) => `${p.courseNo} (${p.courseNameThai || ''})`)
      .join(', ');
  }

  // ============================================================
  // CUSTOM CONTEXT MENU & MODAL ACTIONS
  // ============================================================
  @HostListener('document:click', ['$event'])
  onDocumentClick(event?: MouseEvent): void {
    if (this.isContextMenuOpen()) {
      this.closeContextMenu();
    }
    if (this.isEmptySlotMenuOpen()) {
      this.closeEmptySlotMenu();
    }
    if (this.isInlineDropdownOpen() && event) {
      const target = event.target as HTMLElement;
      if (target && !target.closest('.inline-picker-group')) {
        this.isInlineDropdownOpen.set(false);
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isContextMenuOpen()) {
      this.closeContextMenu();
    }
    if (this.isEmptySlotMenuOpen()) {
      this.closeEmptySlotMenu();
    }
    if (this.isEditModalOpen()) {
      this.closeEditModal();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.isContextMenuOpen()) {
      this.closeContextMenu();
    }
    if (this.isEmptySlotMenuOpen()) {
      this.closeEmptySlotMenu();
    }
  }

  onCardContextMenu(event: MouseEvent, item: ScheduleClassItem): void {
    event.preventDefault();
    event.stopPropagation();

    this.closeEmptySlotMenu();
    this.contextMenuItem.set(item);

    const menuWidth = 240;
    const menuHeight = 220;
    let x = event.clientX;
    let y = event.clientY;

    // Viewport guard so menu never overflows off-screen
    if (x + menuWidth > window.innerWidth - 12) {
      x = Math.max(12, window.innerWidth - menuWidth - 12);
    }
    if (y + menuHeight > window.innerHeight - 12) {
      y = Math.max(12, window.innerHeight - menuHeight - 12);
    }

    this.contextMenuPos.set({ x, y });
    this.isContextMenuOpen.set(true);
  }

  closeContextMenu(): void {
    this.isContextMenuOpen.set(false);
  }

  onSlotContextMenu(event: MouseEvent, dayCode: number, timeCode: number, cellClasses?: ScheduleClassItem[]): void {
    if (this.isEditMode()) return;

    // If cell has courses, contextmenu is handled on card level
    if (cellClasses && cellClasses.length > 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.closeContextMenu();

    const timeObj = this.timeSlots().find((t) => t.code === timeCode);
    const dayObj = this.daysConfig.find((d) => d.code === dayCode);

    this.emptySlotContext.set({
      dayCode,
      timeCode,
      dayLabel: dayObj?.shortLabel || this.getDayLabel(dayCode),
      timePeriod: timeObj?.period || `คาบที่ ${timeCode}`,
    });

    const menuWidth = 260;
    const menuHeight = 150;
    let x = event.clientX;
    let y = event.clientY;

    if (x + menuWidth > window.innerWidth - 12) {
      x = Math.max(12, window.innerWidth - menuWidth - 12);
    }
    if (y + menuHeight > window.innerHeight - 12) {
      y = Math.max(12, window.innerHeight - menuHeight - 12);
    }

    this.contextMenuPos.set({ x, y });
    this.isEmptySlotMenuOpen.set(true);
  }

  closeEmptySlotMenu(): void {
    this.isEmptySlotMenuOpen.set(false);
    this.emptySlotContext.set(null);
  }

  addFromEmptySlot(): void {
    const slot = this.emptySlotContext();
    this.closeEmptySlotMenu();
    if (slot) {
      this.openAddClassModal(slot.dayCode, slot.timeCode);
    } else {
      this.openAddClassModal();
    }
  }

  openEditModalFromMenu(item: ScheduleClassItem): void {
    this.closeContextMenu();
    this.openEditModal(item);
  }

  openDetailModalFromMenu(item: ScheduleClassItem): void {
    this.closeContextMenu();
    this.openClassDetail(item);
  }

  openEditFromDetail(item: ScheduleClassItem): void {
    this.closeDetailModal();
    this.openEditModal(item);
  }

  async deleteClassFromDetail(item: ScheduleClassItem): Promise<void> {
    this.closeDetailModal();
    await this.deleteClassFromMenu(item);
  }

  // ============================================================
  // EDIT MODAL METHODS
  // ============================================================
  loadInstructors(): void {
    const year = this.activeYear();
    const sem = this.activeSemester();
    this.isInstructorsLoading.set(true);
    this.http
      .get<{ success: boolean; results: InstructorItem[] }>(
        `/api/service/timetable/instructors?year=${year}&semester=${sem}`
      )
      .subscribe({
        next: (res) => {
          this.isInstructorsLoading.set(false);
          if (res && res.success && res.results) {
            this.allInstructors.set(res.results);
          }
        },
        error: () => {
          this.isInstructorsLoading.set(false);
        },
      });
  }

  loadAllRoomOptions(): void {
    this.http.get<{ success: boolean; results: any[] }>('/api/service/timetable/rooms').subscribe({
      next: (res) => {
        if (res && res.success && res.results) {
          const mapped: SelectOption[] = res.results.map((r: any) => ({
            value: r.value || r.ROOM_CODE,
            label: this.formatRoomLabel(r.label || r.ROOM_DETAIL || r.ROOM_CODE),
            icon: 'meeting_room',
          }));
          this.allRoomOptions.set(mapped);
        }
      },
    });
  }

  getInstructorName(code: string): string {
    const inst = this.allInstructors().find((i) => i.INSTRUCTOR_CODE === code);
    if (!inst) return code;
    return `${inst.RANK_NAME_THAI_S || ''} ${inst.INSTRUCTOR_NAME_THAI || code}`.trim();
  }

  // ============================================================
  // INLINE COURSE SEARCH METHODS (FOR ADD MODE)
  // ============================================================
  openInlineDropdown(): void {
    this.isInlineDropdownOpen.set(true);
    if (this.inlineSearchResults().length === 0) {
      this.executeInlineCourseSearch(this.inlineSearchQuery() || this.editCourseNo() || 'A');
    }
  }

  closeInlineDropdown(): void {
    this.isInlineDropdownOpen.set(false);
  }

  toggleInlineDropdown(): void {
    if (this.isInlineDropdownOpen()) {
      this.closeInlineDropdown();
    } else {
      this.openInlineDropdown();
    }
  }

  onInlineSearchChange(val: string): void {
    this.inlineSearchQuery.set(val);
    this.isInlineDropdownOpen.set(true);

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.executeInlineCourseSearch(val);
    }, 250);
  }

  executeInlineCourseSearch(query: string): void {
    const q = (query || '').trim();
    this.isInlineSearching.set(true);

    const year = this.activeYear();
    const sem = this.activeSemester();

    let url = `/api/service/timetable/search-ugb?year=${year}&semester=${sem}`;
    if (q) {
      url += `&search=${encodeURIComponent(q)}`;
    }

    this.http.get<{ success: boolean; results: CourseOption[] }>(url).subscribe({
      next: (res) => {
        this.isInlineSearching.set(false);
        if (res && res.success) {
          this.inlineSearchResults.set(res.results || []);
        } else {
          this.inlineSearchResults.set([]);
        }
      },
      error: () => {
        this.isInlineSearching.set(false);
        this.inlineSearchResults.set([]);
      },
    });
  }

  selectInlineCourse(c: CourseOption): void {
    this.editCourseNo.set(c.COURSE_NO);
    this.editCourseName.set(c.COURSE_NAME_THAI);
    this.editCourseCredit.set(c.CREDIT ?? null);
    this.inlineSearchQuery.set('');
    this.isInlineDropdownOpen.set(false);
  }

  clearCourseSelection(): void {
    this.editCourseNo.set('');
    this.editCourseName.set('');
    this.editCourseCredit.set(null);
    this.inlineSearchQuery.set('');
    this.editInstructorCodes.set([]);
    this.availabilitySlots.set([]);
    this.commonFreeSlots.set([]);
  }

  // ============================================================
  // ADD / EDIT CLASS MODAL HANDLERS
  // ============================================================
  openAddClassModal(presetDayCode?: number, presetTimeCode?: number): void {
    this.isAddMode.set(true);
    this.editingItem.set(null);
    this.editFormError.set('');
    this.editCourseNo.set('');
    this.editCourseName.set('');
    this.editCourseCredit.set(null);
    this.editDayCode.set(presetDayCode !== undefined && presetDayCode !== null ? Number(presetDayCode) : 1);
    this.editTimeCodes.set(presetTimeCode !== undefined && presetTimeCode !== null ? [Number(presetTimeCode)] : []);
    this.editRoomCode.set(this.selectedRoom() || '');
    this.editInstructorCodes.set([]);
    this.inlineSearchQuery.set('');
    this.inlineSearchResults.set([]);
    this.isInlineDropdownOpen.set(false);
    this.availabilitySlots.set([]);
    this.commonFreeSlots.set([]);
    this.instructorSearch.set('');
    this.instructorPickerLimit.set(40);
    this.isEditModalOpen.set(true);

    if (this.allInstructors().length === 0) {
      this.loadInstructors();
    }
    if (this.allRoomOptions().length === 0) {
      this.loadAllRoomOptions();
    }

    if (!this.tourService.isTourCompleted('student_schedule_add_modal_tour_v2')) {
      setTimeout(() => {
        this.startAddClassModalTour(false);
      }, 400);
    }

    this.fetchSlotAvailableInstructors();
  }

  openEditModal(item: ScheduleClassItem, spannedTimeCodes?: number[]): void {
    this.closeContextMenu();
    this.isAddMode.set(false);
    this.editingItem.set(item);
    this.editCourseNo.set((item.COURSE_NO || '').trim());
    this.editCourseName.set(item.COURSE_NAME_THAI || item.COURSE_NAME_ENG || '');
    this.editCourseCredit.set(item.CREDIT || null);
    this.editFormError.set('');
    this.editDayCode.set(item.DAY_CODE !== undefined && item.DAY_CODE !== null ? Number(item.DAY_CODE) : 1);

    if (spannedTimeCodes && spannedTimeCodes.length > 0) {
      this.editTimeCodes.set([...spannedTimeCodes].sort((a, b) => a - b));
    } else {
      const siblings = this.classList().filter(
        (c) =>
          c.COURSE_NO === item.COURSE_NO &&
          Number(c.DAY_CODE) === Number(item.DAY_CODE) &&
          (item.INSTR_GROUP == null || c.INSTR_GROUP === item.INSTR_GROUP)
      );
      const siblingCodes = Array.from(new Set(siblings.map((c) => Number(c.TIME_CODE)))).sort((a, b) => a - b);
      this.editTimeCodes.set(siblingCodes.length > 0 ? siblingCodes : [Number(item.TIME_CODE) || 1]);
    }

    this.editRoomCode.set((item.ROOM_CODE || this.selectedRoom() || '').trim());

    const instCodes = (item.INSTRUCTORS || [])
      .map((i) => (i.INSTRUCTOR_CODE || '').toString().trim())
      .filter(Boolean);
    this.editInstructorCodes.set(instCodes);

    this.inlineSearchQuery.set('');
    this.inlineSearchResults.set([]);
    this.isInlineDropdownOpen.set(false);
    this.instructorSearch.set('');
    this.instructorPickerLimit.set(40);
    this.isEditModalOpen.set(true);

    if (this.allInstructors().length === 0) {
      this.loadInstructors();
    }
    if (this.allRoomOptions().length === 0) {
      this.loadAllRoomOptions();
    }

    if (instCodes.length > 0) {
      this.fetchInstructorAvailability();
    } else {
      this.availabilitySlots.set([]);
      this.commonFreeSlots.set([]);
    }

    this.fetchSlotAvailableInstructors();
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.isAddMode.set(false);
    this.editingItem.set(null);
    this.editFormError.set('');
    this.instructorSearch.set('');
    this.inlineSearchQuery.set('');
    this.isInlineDropdownOpen.set(false);
    this.availabilitySlots.set([]);
    this.commonFreeSlots.set([]);
    this.slotAvailableInstructorCodes.set(new Set());
    this.slotInstructorsStatusMap.set({});
  }

  // ============================================================
  // CLONE TIMETABLE MODAL HANDLERS
  // ============================================================
  openCloneModal(): void {
    const curYear = Number(this.activeYear());
    this.cloneSourceYear.set(isNaN(curYear) ? '' : String(curYear - 1));
    this.cloneSourceSemester.set(this.activeSemester() || '1');
    this.cloneMode.set('merge');
    this.isCloneModalOpen.set(true);
  }

  closeCloneModal(): void {
    this.isCloneModalOpen.set(false);
  }

  async submitCloneSemester(): Promise<void> {
    const sYear = this.cloneSourceYear().trim();
    const sSem = this.cloneSourceSemester().trim();
    const tYear = this.activeYear();
    const tSem = this.activeSemester();

    if (!sYear || !sSem) {
      this.toastService.warning('กรุณาระบุปีและภาคการศึกษาต้นทาง');
      return;
    }

    if (sYear === tYear && sSem === tSem) {
      this.toastService.warning('ปี/ภาคต้นทางและปลายทางต้องไม่ซ้ำกัน');
      return;
    }

    const modeText = this.cloneMode() === 'replace' ? 'แทนที่ทั้งหมด (ล้างตารางเดิม)' : 'ต่อเติมข้อมูล (Merge)';

    const confirmed = await this.confirmDialogService.confirm({
      title: 'ยืนยันคัดลอกตารางสอน',
      message: `ต้องการคัดลอกตารางสอนจากปี ${sYear} ภาค ${sSem} ไปยังปี ${tYear} ภาค ${tSem} (รูปแบบ: ${modeText}) หรือไม่?`,
      confirmText: 'เริ่มคัดลอก',
      cancelText: 'ยกเลิก',
      variant: this.cloneMode() === 'replace' ? 'danger' : 'primary',
      icon: 'content_copy',
    });

    if (!confirmed) return;

    this.isCloning.set(true);
    const payload = {
      sourceYear: sYear,
      sourceSemester: sSem,
      targetYear: tYear,
      targetSemester: tSem,
      mode: this.cloneMode(),
      userInsert: this.authService.currentUser()?.email?.split('@')[0] || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string; insertedCount?: number }>(
      '/api/service/timetable/clone-semester',
      payload
    ).subscribe({
      next: (res) => {
        this.isCloning.set(false);
        if (res && res.success) {
          this.toastService.success(res.message || 'คัดลอกตารางสอนสำเร็จ');
          this.closeCloneModal();
          this.loadRoomsAndSchedule();
        } else {
          this.toastService.error(res?.message || 'ไม่สามารถคัดลอกตารางสอนได้');
        }
      },
      error: (err) => {
        this.isCloning.set(false);
        this.toastService.error(err?.error?.message || err?.message || 'เกิดข้อผิดพลาดในการคัดลอกตารางสอน');
      },
    });
  }

  fetchInstructorAvailability(): void {
    const codes = this.editInstructorCodes();
    if (codes.length === 0) {
      this.availabilitySlots.set([]);
      this.commonFreeSlots.set([]);
      return;
    }

    this.isAvailabilityLoading.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();
    const codesParam = encodeURIComponent(codes.join(','));

    const currentCourse = this.editCourseNo().trim();
    let url = `/api/service/timetable/instructor-availability?year=${year}&semester=${sem}&instructorCodes=${codesParam}`;
    if (currentCourse) {
      url += `&courseNo=${encodeURIComponent(currentCourse)}`;
    }

    this.http
      .get<{
        success: boolean;
        totalInstructors: number;
        hasRu30Schedule?: boolean;
        slots: InstructorSlotAvailability[];
        commonFreeSlots: InstructorSlotAvailability[];
      }>(url)
      .subscribe({
        next: (res) => {
          this.isAvailabilityLoading.set(false);
          if (res && res.success && res.slots && res.slots.length > 0) {
            this.hasRu30Schedule.set(!!res.hasRu30Schedule);
            this.availabilitySlots.set(res.slots);
            this.commonFreeSlots.set(res.commonFreeSlots || []);
          } else {
            this.hasRu30Schedule.set(false);
            this.availabilitySlots.set([]);
            this.commonFreeSlots.set([]);
          }
        },
        error: () => {
          this.isAvailabilityLoading.set(false);
          this.hasRu30Schedule.set(false);
          this.availabilitySlots.set([]);
          this.commonFreeSlots.set([]);
        },
      });
  }

  fetchSlotAvailableInstructors(): void {
    const day = this.editDayCode();
    const times = this.editTimeCodes();
    if (day === null || times.length === 0) {
      this.slotAvailableInstructorCodes.set(new Set());
      this.slotInstructorsStatusMap.set({});
      return;
    }

    this.isCheckingSlotInstructors.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();
    const timesParam = encodeURIComponent(times.join(','));
    const currentCourse = encodeURIComponent((this.editCourseNo() || '').trim());
    const url = `/api/service/timetable/slot-available-instructors?year=${year}&semester=${sem}&dayCode=${day}&timeCodes=${timesParam}&courseNo=${currentCourse}`;

    this.http
      .get<{
        success: boolean;
        availableCodes: string[];
        busyCodes: string[];
        instructorsStatus: Record<string, { isAvailable: boolean; status: string; reason: string }>;
      }>(url)
      .subscribe({
        next: (res) => {
          this.isCheckingSlotInstructors.set(false);
          if (res && res.success) {
            this.slotAvailableInstructorCodes.set(new Set((res.availableCodes || []).map((c) => c.trim())));
            this.slotInstructorsStatusMap.set(res.instructorsStatus || {});
          } else {
            this.slotAvailableInstructorCodes.set(new Set());
            this.slotInstructorsStatusMap.set({});
          }
        },
        error: () => {
          this.isCheckingSlotInstructors.set(false);
          this.slotAvailableInstructorCodes.set(new Set());
          this.slotInstructorsStatusMap.set({});
        },
      });
  }

  isInstructorAvailable(code: string): boolean {
    if (!this.hasSelectedSlot()) return false;
    return this.slotAvailableInstructorCodes().has((code || '').trim());
  }

  isInstructorBusy(code: string): boolean {
    if (!this.hasSelectedSlot()) return false;
    return !this.slotAvailableInstructorCodes().has((code || '').trim());
  }

  getInstructorStatusBadge(code: string): { type: 'available' | 'busy' | 'unavailable'; text: string; icon: string; tooltip: string } | null {
    if (!this.hasSelectedSlot()) return null;
    const cleanCode = (code || '').trim();
    if (this.slotAvailableInstructorCodes().has(cleanCode)) {
      return {
        type: 'available',
        text: 'ว่างสอน',
        icon: 'check_circle',
        tooltip: 'อาจารย์สามารถสอนในวันและเวลานี้ได้ (ว่างสอน)',
      };
    }
    const status = this.slotInstructorsStatusMap()[cleanCode];
    if (status && status.status === 'busy') {
      return {
        type: 'busy',
        text: 'ติดสอน',
        icon: 'block',
        tooltip: status.reason || 'อาจารย์ติดสอนวิชาอื่นในคาบนี้',
      };
    }
    if (status && status.status === 'ru30_unavailable') {
      return {
        type: 'unavailable',
        text: 'ไม่ว่าง มร.30',
        icon: 'event_busy',
        tooltip: status.reason || 'ไม่ได้ลงเวลาสอนในคาบนี้ (มร.30)',
      };
    }
    return {
      type: 'unavailable',
      text: 'ไม่ว่างสอน',
      icon: 'block',
      tooltip: status?.reason || 'ไม่ว่างสอนในคาบนี้',
    };
  }

  getInstructorStatus(code: string): { isAvailable: boolean; status: string; reason: string } | null {
    return this.slotInstructorsStatusMap()[(code || '').trim()] || null;
  }

  applyAvailableSlot(slot: InstructorSlotAvailability): void {
    const currentDay = this.editDayCode();
    const currentCodes = [...this.editTimeCodes()];

    // 1. ตรวจสอบการเลือกข้ามวัน: ถ้ามีวันเลือกอยู่แล้ว และ slot.dayCode ไม่ตรงกับวันปัจจุบัน
    if (currentDay !== null && currentDay !== undefined && currentDay !== slot.dayCode && currentCodes.length > 0) {
      const dayLabel = this.getDayLabel(currentDay);
      this.toastService.warning('ไม่สามารถเลือกคาบเรียนข้ามวันในหน้านี้ได้', {
        description: `วิชานี้เลือกวัน${dayLabel}อยู่ หากต้องการเปลี่ยนวัน กรุณาเลือกวันเรียนที่ฟอร์มด้านซ้าย หรือเลือกคาบในวันเดียวกัน`,
      });
      return;
    }

    // 2. ถ้าเป็นวันเดียวกัน: ทำการ Toggle (เพิ่ม หรือ ลบ คาบเวลา)
    if (currentDay === slot.dayCode) {
      const idx = currentCodes.indexOf(slot.timeCode);
      if (idx > -1) {
        // อยู่ในรายการที่เลือกแล้ว -> กดยกเลิก
        if (currentCodes.length === 1) {
          this.toastService.warning('ต้องเลือกคาบเวลาอย่างน้อย 1 คาบ');
          return;
        }
        currentCodes.splice(idx, 1);
        currentCodes.sort((a, b) => a - b);
        this.editTimeCodes.set(currentCodes);
        this.toastService.info(`ยกเลิกคาบที่ ${slot.timeCode} (${slot.period}) เรียบร้อยแล้ว`);
      } else {
        // ยังไม่ได้เลือก -> เพิ่มคาบนี้เข้าไป
        currentCodes.push(slot.timeCode);
        currentCodes.sort((a, b) => a - b);
        this.editTimeCodes.set(currentCodes);
        this.toastService.success(`เลือกเพิ่มคาบที่ ${slot.timeCode} (${slot.period}) วัน${slot.dayShort} เรียบร้อยแล้ว`);
      }
    } else {
      // กรณียังไม่มีวันเลือก
      this.editDayCode.set(slot.dayCode);
      this.editTimeCodes.set([slot.timeCode]);
      this.toastService.success(`เลือกวัน ${slot.dayLabel} คาบที่ ${slot.timeCode} (${slot.period}) เรียบร้อยแล้ว`);
    }
    this.fetchSlotAvailableInstructors();
  }

  isInstructorSelected(code: string): boolean {
    return this.editInstructorCodes().includes(code.trim());
  }

  toggleInstructorCode(code: string): void {
    const clean = code.trim();
    const current = this.editInstructorCodes();
    if (current.includes(clean)) {
      this.editInstructorCodes.set(current.filter((c) => c !== clean));
    } else {
      this.editInstructorCodes.set([...current, clean]);
    }
    this.fetchInstructorAvailability();
  }

  removeInstructor(code: string): void {
    const clean = code.trim();
    this.editInstructorCodes.update((list) => list.filter((c) => c !== clean));
    this.fetchInstructorAvailability();
  }

  clearInstructorSelection(): void {
    this.editInstructorCodes.set([]);
    this.availabilitySlots.set([]);
    this.commonFreeSlots.set([]);
  }

  loadMoreInstructors(): void {
    this.instructorPickerLimit.update((l) => l + 40);
  }

  showAllInstructors(): void {
    this.instructorPickerLimit.set(this.filteredInstructorsList().length);
  }

  saveEditClass(): void {
    const courseNo = this.editCourseNo().trim();
    if (!courseNo) {
      this.editFormError.set('กรุณาระบุหรือเลือกกระบวนวิชา');
      this.toastService.error('กรุณาเลือกกระบวนวิชา');
      return;
    }

    const room = this.editRoomCode().trim();
    if (!room) {
      this.editFormError.set('กรุณาระบุหรือเลือกห้องเรียน');
      this.toastService.error('กรุณาระบุห้องเรียน');
      return;
    }

    const timeCodes = this.editTimeCodes();
    if (timeCodes.length === 0) {
      this.editFormError.set('ยังไม่ได้เลือกคาบเวลา กรุณาเลือกคาบเวลาเรียน');
      this.toastService.warning('ยังไม่ได้เลือกคาบเวลา กรุณาเลือกคาบเวลาเรียน');
      return;
    }

    if (!this.isSelectedSlotAvailableForInstructors()) {
      const reason = this.slotUnavailabilityReason();
      this.editFormError.set(`ไม่สามารถบันทึกได้: อาจารย์ไม่ว่างในคาบนี้ (${reason})`);
      this.toastService.error(this.editFormError());
      return;
    }

    this.isSavingEdit.set(true);
    this.editFormError.set('');

    const isAdd = this.isAddMode();
    const endpoint = isAdd ? '/api/service/timetable/add' : '/api/service/timetable/update';

    const payload = {
      studyYear: this.activeYear(),
      studySemester: this.activeSemester(),
      courseNo: courseNo,
      dayCode: this.editDayCode(),
      timeCode: timeCodes[0],
      timeCodes: timeCodes,
      roomCode: room,
      instructorCodes: this.editInstructorCodes(),
      userInsert: this.authService.currentUser()?.email || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string }>(endpoint, payload).subscribe({
      next: (res) => {
        this.isSavingEdit.set(false);
        if (res && res.success) {
          const actionText = isAdd ? 'เพิ่มข้อมูลตารางสอนสำเร็จ' : 'แก้ไขตารางสอนสำเร็จ';
          this.toastService.success(res.message || `${actionText} วิชา ${courseNo}`);
          const oldRoom = this.selectedRoom();
          this.closeEditModal();
          this.loadRoomsAndSchedule();

          if (isAdd && room && room !== oldRoom && !this.selectedRoom()) {
            this.selectedRoom.set(room);
            this.loadScheduleForRoom();
          } else if (!isAdd && room !== oldRoom) {
            this.toastService.info(`วิชา ${courseNo} ถูกย้ายไปยังห้อง ${room}`, {
              description: 'ระบบอัปเดตข้อมูลห้องเรียนเรียบร้อยแล้ว',
            });
          }
        } else {
          this.editFormError.set(res?.message || 'เกิดข้อผิดพลาดในการบันทึก');
          this.toastService.error(this.editFormError());
        }
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        this.editFormError.set(err?.error?.message || err?.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
        this.toastService.error(this.editFormError());
      },
    });
  }

  // ============================================================
  // DELETE CLASS METHOD
  // ============================================================
  async deleteClassFromMenu(item: ScheduleClassItem): Promise<void> {
    this.closeContextMenu();

    const courseTitle = `${item.COURSE_NO} (${item.COURSE_NAME_THAI || ''})`.trim();
    const confirmed = await this.confirmDialogService.confirm({
      title: 'ยืนยันการลบตารางสอน',
      message: `คุณต้องการลบตารางสอนวิชา "${courseTitle}" ใช่หรือไม่?`,
      detail: 'ระบบจะสำรองประวัติการลบไว้ในตาราง HIS ให้อัตโนมัติ',
      confirmText: 'ลบตารางสอน',
      cancelText: 'ยกเลิก',
      variant: 'danger',
    });

    if (!confirmed) return;

    // ค้นหาทุกคาบที่เรียนต่อเนื่องกันของวิชานี้ในวันและห้องเดียวกัน เพื่อลบออกทั้งหมดพร้อมกัน
    const siblings = this.classList().filter(
      (c) =>
        c.COURSE_NO === item.COURSE_NO &&
        Number(c.DAY_CODE) === Number(item.DAY_CODE) &&
        (item.INSTR_GROUP == null || c.INSTR_GROUP === item.INSTR_GROUP)
    );
    const siblingCodes = Array.from(new Set(siblings.map((c) => Number(c.TIME_CODE)))).sort((a, b) => a - b);
    const targetTimeCodes = siblingCodes.length > 0 ? siblingCodes : [Number(item.TIME_CODE)];

    const payload = {
      studyYear: item.STUDY_YEAR || this.activeYear(),
      studySemester: item.STUDY_SEMESTER || this.activeSemester(),
      courseNo: item.COURSE_NO,
      dayCode: item.DAY_CODE,
      timeCode: item.TIME_CODE,
      timeCodes: targetTimeCodes,
      roomCode: item.ROOM_CODE || this.selectedRoom(),
      instrGroup: item.INSTR_GROUP,
      userInsert: this.authService.currentUser()?.email || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string }>('/api/service/timetable/delete', payload).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.toastService.success(`ลบตารางสอนวิชา ${item.COURSE_NO} เรียบร้อยแล้ว`);
          this.loadScheduleForRoom();
          this.loadRoomsAndSchedule();
        } else {
          this.toastService.error(res?.message || 'ลบตารางสอนไม่สำเร็จ');
        }
      },
      error: (err) => {
        this.toastService.error(err?.error?.message || err?.message || 'ลบตารางสอนไม่สำเร็จ');
      },
    });
  }
}

