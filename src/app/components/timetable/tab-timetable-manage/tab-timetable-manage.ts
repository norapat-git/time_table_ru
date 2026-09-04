import { Component, signal, computed, inject, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../../common/skeleton/skeleton';
import { CustomSelectComponent, SelectOption } from '../../common/custom-select/custom-select';
import { CustomCheckboxComponent } from '../../common/custom-checkbox/custom-checkbox';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { OnboardingTourService, TourStep } from '../../../services/onboarding-tour.service';

export interface InstructorItem {
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI?: string;
  INSTRUCTOR_NAME_ENG?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
  INSTRUCTOR_ORD?: string;
}

export interface ScheduleClassItem {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  COURSE_NO: string;
  DAY_CODE: number;
  TIME_CODE: number;
  ROOM_CODE?: string;
  ROOM_DETAIL?: string;
  INSTR_GROUP: number;
  INSERT_DATE?: string;
  USER_INSERT?: string;
  COURSE_NAME_THAI?: string;
  COURSE_NAME_ENG?: string;
  CREDIT?: number;
  INSTRUCTORS: InstructorItem[];
  PAIRED_COURSES?: any[];
  HAS_PAIRED_COURSES?: boolean;
}

export interface Ru30OptionSlot {
  DAY_CODE: number;
  TIME_CODE: number;
  BUILDING_CODE?: string;
  ROOM_CODE?: string;
  INSTRUCTORS: InstructorItem[];
}

export interface CoursePrefixOption {
  PREFIX_NAME: string;
  COURSE_COUNT: number;
}

export interface CourseOption {
  COURSE_NO: string;
  COURSE_NAME_THAI: string;
  COURSE_NAME_ENG?: string;
  CREDIT?: number;
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

export interface ScheduleDayOption {
  code: number;
  label: string;
  shortLabel: string;
  standardName?: string;
  colorClass: string;
}

export interface ScheduleTimeOption {
  code: number;
  TIME_CODE: string;
  TIME_START?: string;
  TIME_END?: string;
  TIME_RU30?: string;
  FLAG_DISPLAY?: number;
  label?: string;
  period?: string;
}

import { CustomContextMenuComponent, ContextMenuItem } from '../../common/custom-context-menu/custom-context-menu.component';

@Component({
  selector: 'app-tab-timetable-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, CustomSelectComponent, CustomCheckboxComponent, CustomContextMenuComponent],
  templateUrl: './tab-timetable-manage.html',
  styleUrl: './tab-timetable-manage.css',
})
export class TabTimetableManageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  readonly tourService = inject(OnboardingTourService);

  // Context Menu State
  readonly isContextMenuOpen = signal<boolean>(false);
  readonly contextMenuPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly selectedContextMenuClass = signal<ScheduleClassItem | null>(null);

  readonly contextMenuItems = computed<ContextMenuItem[]>(() => {
    const item = this.selectedContextMenuClass();
    if (!item) return [];

    return [
      {
        id: 'edit',
        label: 'แก้ไขข้อมูลตารางสอน',
        sublabel: 'วัน คาบ ห้องเรียน อาจารย์',
        icon: 'edit',
        iconType: 'edit',
        action: () => this.openEditModal(item),
      },
      {
        id: 'detail',
        label: 'ดูรายละเอียดตารางสอน',
        sublabel: 'ข้อมูลและอาจารย์ผู้สอน',
        icon: 'visibility',
        iconType: 'detail',
        dividerAfter: true,
        action: () => this.openDetailModal(item),
      },
      {
        id: 'delete',
        label: 'ลบข้อมูลตารางสอน',
        sublabel: `วิชา ${item.COURSE_NO} (ย้ายลง HIS)`,
        icon: 'delete',
        iconType: 'delete',
        variant: 'danger',
        action: () => this.deleteClass(item),
      },
    ];
  });

  onRowContextMenu(event: MouseEvent, item: ScheduleClassItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedContextMenuClass.set(item);
    this.contextMenuPos.set({ x: event.clientX, y: event.clientY });
    this.isContextMenuOpen.set(true);
  }

  openMenuFromBtn(event: MouseEvent, item: ScheduleClassItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedContextMenuClass.set(item);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.contextMenuPos.set({ x: rect.left, y: rect.bottom + 4 });
    this.isContextMenuOpen.set(true);
  }

  // Active Year / Semester
  readonly activeYear = signal<string>('');
  readonly activeSemester = signal<string>('');
  readonly yearSemList = signal<{ STUDY_YEAR: string; STUDY_SEMESTER: string; STUDY_ACTIVE: string }[]>([]);
  readonly selectedYearSem = signal<string>('');

  readonly yearSemSelectOptions = computed<SelectOption[]>(() => {
    return this.yearSemList().map((item) => ({
      value: `${item.STUDY_YEAR}_${item.STUDY_SEMESTER}`,
      label: `ปีการศึกษา ${item.STUDY_YEAR} ภาค ${item.STUDY_SEMESTER}`,
      badge: item.STUDY_ACTIVE === '1' ? 'ปัจจุบัน' : undefined,
    }));
  });

  // Main Table Search & Filters
  readonly searchQuery = signal<string>('');
  readonly selectedDayFilter = signal<number | null>(null);
  readonly selectedRoomFilter = signal<string>('ALL');

  // Main Table Data
  readonly classList = signal<ScheduleClassItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isBulkDeleting = signal<boolean>(false);

  // Selection for Bulk Delete
  readonly selectedClassKeys = signal<string[]>([]);

  // Detail Modal State
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly selectedClassDetail = signal<ScheduleClassItem | null>(null);

  // Add / Edit Class Modal State
  readonly isAddModalOpen = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingItem = signal<ScheduleClassItem | null>(null);
  readonly formCourseNo = signal<string>('');
  readonly formCourseName = signal<string>('');
  readonly formCourseCredit = signal<number | null>(null);
  readonly formDayCode = signal<number | null>(null);
  readonly formTimeCode = signal<number | null>(null);
  readonly formTimeCodes = signal<number[]>([]);
  readonly formRoomCode = signal<string>('');
  readonly formInstructorCodes = signal<string[]>([]);
  readonly formError = signal<string>('');

  readonly formPeriodDurationText = computed<string>(() => {
    const times = this.formTimeCodes();
    if (times.length === 0) return 'ยังไม่ได้เลือกคาบ';
    const sorted = [...times].sort((a, b) => a - b);
    const count = sorted.length;
    const hours = count * 2;
    if (count === 1) return `1 คาบ (${hours} ชม.)`;
    return `${count} คาบ (${hours} ชม.) • คาบที่ ${sorted.join(', ')}`;
  });

  // Feature 1: Instructor Conflict Alert
  readonly instructorConflict = signal<string | null>(null);

  // Feature 2: Smart Slot Recommender
  readonly isRecommending = signal<boolean>(false);
  readonly recommendations = signal<any[]>([]);
  readonly isRecommendModalOpen = signal<boolean>(false);

  // Feature 3: Clone Timetable
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

  // Inline Search State (Matching tab-paired-courses)
  readonly inlineSearchQuery = signal<string>('');
  readonly inlineSearchResults = signal<CourseOption[]>([]);
  readonly isInlineSearching = signal<boolean>(false);
  readonly isInlineDropdownOpen = signal<boolean>(false);
  private searchDebounceTimer: any = null;

  // Right-Side Alphabetical Drawer State (Matching tab-paired-courses)
  readonly isDrawerOpen = signal<boolean>(false);
  readonly letters = signal<string[]>([]);
  readonly isLettersLoading = signal<boolean>(false);
  readonly selectedLetter = signal<string>('');
  readonly prefixes = signal<CoursePrefixOption[]>([]);
  readonly isPrefixesLoading = signal<boolean>(false);
  readonly selectedPrefix = signal<string>('');
  readonly drawerCourses = signal<CourseOption[]>([]);
  readonly isDrawerCoursesLoading = signal<boolean>(false);
  readonly drawerCodeQuery = signal<string>('');
  readonly drawerNameQuery = signal<string>('');

  // Master Instructors for Multi-Select
  readonly allInstructors = signal<InstructorItem[]>([]);
  readonly isInstructorsLoading = signal<boolean>(false);
  readonly instructorSearch = signal<string>('');

  // Slot Available Instructors State (อาจารย์ที่สามารถสอนได้ในวันและคาบที่เลือก)
  readonly slotAvailableInstructorCodes = signal<Set<string>>(new Set());
  readonly slotInstructorsStatusMap = signal<Record<string, { isAvailable: boolean; status: string; reason: string }>>({});
  readonly isCheckingSlotInstructors = signal<boolean>(false);
  readonly instructorFilterMode = signal<'all' | 'available' | 'busy'>('all');

  readonly hasSelectedSlot = computed<boolean>(() => {
    return this.formDayCode() !== null && this.formTimeCodes().length > 0;
  });

  readonly availableInstructorsCount = computed<number>(() => {
    return this.slotAvailableInstructorCodes().size;
  });

  // Instructor Availability Matrix State (Side Panel in Add Modal)
  readonly availabilitySlots = signal<InstructorSlotAvailability[]>([]);
  readonly commonFreeSlots = signal<InstructorSlotAvailability[]>([]);
  readonly isAvailabilityLoading = signal<boolean>(false);
  readonly isAvailabilityPanelOpen = signal<boolean>(true);

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

  readonly isSelectedSlotAvailableForInstructors = computed<boolean>(() => {
    const instCodes = this.formInstructorCodes();
    const day = this.formDayCode();
    const times = this.formTimeCodes().length > 0 ? this.formTimeCodes() : (this.formTimeCode() !== null ? [this.formTimeCode()!] : []);

    if (instCodes.length === 0 || day === null || times.length === 0) return true;

    const slots = this.availabilitySlots();
    if (this.isAvailabilityLoading() || slots.length === 0) return true;

    const currentCourse = this.formCourseNo().trim().toUpperCase();

    for (const time of times) {
      const matchedSlot = slots.find((s) => s.dayCode === day && s.timeCode === time);
      if (!matchedSlot || !matchedSlot.isRu30Available) {
        return false;
      }
      const genuineBusy = (matchedSlot.busyList || []).filter(
        (b) => (b.courseNo || '').trim().toUpperCase() !== currentCourse
      );
      if (genuineBusy.length > 0) {
        return false;
      }
    }
    return true;
  });

  readonly slotUnavailabilityReason = computed<string>(() => {
    const instCodes = this.formInstructorCodes();
    const day = this.formDayCode();
    const times = this.formTimeCodes().length > 0 ? this.formTimeCodes() : (this.formTimeCode() !== null ? [this.formTimeCode()!] : []);
    if (instCodes.length === 0 || day === null || times.length === 0) return '';

    const slots = this.availabilitySlots();
    if (slots.length === 0) return '';

    const currentCourse = this.formCourseNo().trim().toUpperCase();

    for (const time of times) {
      const matchedSlot = slots.find((s) => s.dayCode === day && s.timeCode === time);
      if (!matchedSlot || !matchedSlot.isRu30Available) {
        return `คาบที่ ${time} ไม่อยู่ในวันและเวลาที่อาจารย์สามารถมาสอนได้ตามตาราง มร.30`;
      }
      const genuineBusy = (matchedSlot.busyList || []).filter(
        (b) => (b.courseNo || '').trim().toUpperCase() !== currentCourse
      );
      if (genuineBusy.length > 0) {
        return `อาจารย์ติดสอนวิชาอื่นในคาบที่ ${time} (${genuineBusy.length} ท่าน)`;
      }
    }
    return '';
  });

  // Day Options (Loaded from UGB_DAY_SCHEDULE: Mon - Sun: 1 - 7)
  readonly dayOptions = signal<ScheduleDayOption[]>([
    { code: 1, label: 'วันจันทร์', shortLabel: 'จันทร์', colorClass: 'day-mon' },
    { code: 2, label: 'วันอังคาร', shortLabel: 'อังคาร', colorClass: 'day-tue' },
    { code: 3, label: 'วันพุธ', shortLabel: 'พุธ', colorClass: 'day-wed' },
    { code: 4, label: 'วันพฤหัสบดี', shortLabel: 'พฤหัสบดี', colorClass: 'day-thu' },
    { code: 5, label: 'วันศุกร์', shortLabel: 'ศุกร์', colorClass: 'day-fri' },
    { code: 6, label: 'วันเสาร์', shortLabel: 'เสาร์', colorClass: 'day-sat' },
    { code: 7, label: 'วันอาทิตย์', shortLabel: 'อาทิตย์', colorClass: 'day-sun' },
  ]);

  // Time Slot Options (Loaded from UGB_TIME_SCHEDULE)
  readonly timeOptions = signal<ScheduleTimeOption[]>([
    { code: 1, TIME_CODE: '1', TIME_START: '0730', TIME_END: '0920', label: 'คาบที่ 1 (07:30 - 09:20)', period: '07:30 - 09:20' },
    { code: 2, TIME_CODE: '2', TIME_START: '0930', TIME_END: '1120', label: 'คาบที่ 2 (09:30 - 11:20)', period: '09:30 - 11:20' },
    { code: 3, TIME_CODE: '3', TIME_START: '1130', TIME_END: '1320', label: 'คาบที่ 3 (11:30 - 13:20)', period: '11:30 - 13:20' },
    { code: 4, TIME_CODE: '4', TIME_START: '1330', TIME_END: '1520', label: 'คาบที่ 4 (13:30 - 15:20)', period: '13:30 - 15:20' },
    { code: 5, TIME_CODE: '5', TIME_START: '1530', TIME_END: '1720', label: 'คาบที่ 5 (15:30 - 17:20)', period: '15:30 - 17:20' },
    { code: 6, TIME_CODE: '6', TIME_START: '1730', TIME_END: '1920', label: 'คาบที่ 6 (17:30 - 19:20)', period: '17:30 - 19:20' },
    { code: 7, TIME_CODE: '7', TIME_START: '1930', TIME_END: '2120', label: 'คาบที่ 7 (19:30 - 21:20)', period: '19:30 - 21:20' },
  ]);

  readonly daySelectOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = this.dayOptions().map((d) => ({
      value: d.code,
      label: d.label,
      badge: d.shortLabel,
    }));
    const currentVal = this.formDayCode();
    if (currentVal !== null && !list.some((o) => o.value === currentVal)) {
      list.push({
        value: currentVal,
        label: `วันรหัส ${currentVal}`,
        badge: `${currentVal}`,
      });
    }
    return list;
  });

  readonly timeSelectOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = this.timeOptions().map((t) => ({
      value: t.code,
      label: `คาบที่ ${t.code}`,
      badge: t.period,
    }));
    const currentVal = this.formTimeCode();
    if (currentVal !== null && !list.some((o) => o.value === currentVal)) {
      list.push({
        value: currentVal,
        label: `คาบที่ ${currentVal}`,
        badge: `รหัส ${currentVal}`,
      });
    }
    return list;
  });

  // Helper to format clean room label without leading codes or colon
  private formatCleanRoomLabel(code: string, detail?: string): string {
    const d = (detail || '').trim();
    const c = (code || '').trim();

    // If detail is present e.g. "ห้อง 1", use it
    if (d) {
      let cleaned = d;
      if (cleaned.includes(' : ')) {
        cleaned = cleaned.split(' : ')[1]?.trim() || cleaned;
      }
      return cleaned.replace(/^(ห้อง\s*)+/gi, 'ห้อง ').trim();
    }

    // If code has "1 : ห้อง 1"
    if (c.includes(' : ')) {
      const cleaned = c.split(' : ')[1]?.trim() || c;
      return cleaned.replace(/^(ห้อง\s*)+/gi, 'ห้อง ').trim();
    }

    // If code is numeric e.g. "1", "2"
    if (/^\d+$/.test(c)) {
      return `ห้อง ${c}`;
    }

    return c.replace(/^(ห้อง\s*)+/gi, 'ห้อง ').trim();
  }

  // Room Options (Loaded from UGB_RU30)
  readonly roomOptions = signal<SelectOption[]>([]);
  readonly roomSelectOptions = computed<SelectOption[]>(() => {
    const list = this.roomOptions().map((o) => ({
      ...o,
      subLabel: undefined,
    }));
    const current = this.formRoomCode();
    if (current && !list.some((o) => o.value === current)) {
      list.unshift({
        value: current,
        label: this.formatCleanRoomLabel(current),
        subLabel: undefined,
        icon: 'meeting_room',
      });
    }
    return list;
  });

  // Room Filter Options for Main Table
  readonly roomFilterOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [
      { value: 'ALL', label: 'ทุกห้องเรียน (All Rooms)', badge: 'ทั้งหมด', icon: 'meeting_room' },
    ];

    const roomSet = new Set<string>();
    const options: SelectOption[] = [];

    // Add rooms loaded from roomOptions
    for (const r of this.roomOptions()) {
      const code = String(r.value || '').trim();
      if (code && !roomSet.has(code.toUpperCase())) {
        roomSet.add(code.toUpperCase());
        const cleanLabel = this.formatCleanRoomLabel(code, r.label);
        options.push({
          value: code,
          label: cleanLabel,
          subLabel: undefined,
          icon: 'meeting_room',
        });
      }
    }

    // Add rooms present in classList()
    for (const c of this.classList()) {
      const code = (c.ROOM_CODE || '').trim();
      if (code && code !== '-' && !roomSet.has(code.toUpperCase())) {
        roomSet.add(code.toUpperCase());
        const cleanLabel = this.formatCleanRoomLabel(code, c.ROOM_DETAIL);
        options.push({
          value: code,
          label: cleanLabel,
          subLabel: undefined,
          icon: 'meeting_room',
        });
      }
    }

    options.sort((a, b) => {
      return String(a.label).localeCompare(String(b.label), 'th', { numeric: true });
    });

    return [...list, ...options];
  });

  // Filtered Main Classes Table
  readonly filteredClasses = computed(() => {
    const list = this.classList();
    const q = this.searchQuery().trim().toLowerCase();
    const day = this.selectedDayFilter();
    const room = this.selectedRoomFilter();

    return list.filter((c) => {
      if (day !== null && c.DAY_CODE !== day) return false;

      if (room !== 'ALL') {
        const itemRoom = (c.ROOM_CODE || '').trim().toLowerCase();
        if (itemRoom !== room.trim().toLowerCase()) return false;
      }

      if (!q) return true;

      const codeMatch = c.COURSE_NO.toLowerCase().includes(q);
      const nameThMatch = (c.COURSE_NAME_THAI || '').toLowerCase().includes(q);
      const nameEnMatch = (c.COURSE_NAME_ENG || '').toLowerCase().includes(q);
      const roomMatch = (c.ROOM_CODE || '').toLowerCase().includes(q);
      const instrMatch = (c.INSTRUCTORS || []).some(
        (i) => (i.INSTRUCTOR_NAME_THAI || '').toLowerCase().includes(q) || (i.INSTRUCTOR_CODE || '').toLowerCase().includes(q)
      );

      return codeMatch || nameThMatch || nameEnMatch || roomMatch || instrMatch;
    });
  });

  // Pagination State (10 items per page)
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly totalItems = computed(() => this.filteredClasses().length);
  readonly totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()) || 1);

  readonly startItemIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endItemIndex = computed(() => {
    const end = this.currentPage() * this.pageSize();
    return Math.min(end, this.totalItems());
  });

  readonly displayedPageNumbers = computed<(number | string)[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  });

  readonly paginatedClasses = computed(() => {
    const list = this.filteredClasses();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // Filtered Drawer Courses
  readonly filteredDrawerCourses = computed(() => {
    const list = this.drawerCourses();
    const codeQ = this.drawerCodeQuery().trim().toLowerCase();
    const nameQ = this.drawerNameQuery().trim().toLowerCase();

    if (!codeQ && !nameQ) return list;

    return list.filter((c) => {
      const matchCode = !codeQ || c.COURSE_NO.toLowerCase().includes(codeQ);
      const matchName =
        !nameQ ||
        (c.COURSE_NAME_THAI || '').toLowerCase().includes(nameQ) ||
        (c.COURSE_NAME_ENG || '').toLowerCase().includes(nameQ);
      return matchCode && matchName;
    });
  });

  // Master Checkbox State
  readonly isAllSelected = computed(() => {
    const visible = this.filteredClasses();
    if (visible.length === 0) return false;
    const selectedSet = new Set(this.selectedClassKeys());
    return visible.every((c) => selectedSet.has(this.getClassKey(c)));
  });

  // Filtered Instructors for Modal Instructor Picker
  readonly instructorPickerLimit = signal<number>(40);

  readonly filteredInstructorsList = computed(() => {
    let list = this.allInstructors();
    const q = this.instructorSearch().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.INSTRUCTOR_CODE.toLowerCase().includes(q) ||
          (i.INSTRUCTOR_NAME_THAI || '').toLowerCase().includes(q) ||
          (i.RANK_NAME_THAI_S || '').toLowerCase().includes(q)
      );
    }

    const filterMode = this.instructorFilterMode();
    if (filterMode === 'available' && this.hasSelectedSlot()) {
      list = list.filter((i) => this.slotAvailableInstructorCodes().has(i.INSTRUCTOR_CODE.trim()));
    } else if (filterMode === 'busy' && this.hasSelectedSlot()) {
      list = list.filter((i) => !this.slotAvailableInstructorCodes().has((i.INSTRUCTOR_CODE || '').trim()));
    }

    // เมื่อเลือกคาบและวันแล้ว ในโหมด 'all' ให้นำอาจารย์ที่ว่างสอนขึ้นมาแสดงด้านบน เพื่อให้ user เลือกได้สะดวกทันที
    if (this.hasSelectedSlot() && filterMode === 'all') {
      const availSet = this.slotAvailableInstructorCodes();
      list = [...list].sort((a, b) => {
        const aAvail = availSet.has(a.INSTRUCTOR_CODE.trim()) ? 1 : 0;
        const bAvail = availSet.has(b.INSTRUCTOR_CODE.trim()) ? 1 : 0;
        return bAvail - aAvail;
      });
    }

    return list;
  });

  readonly displayedFilteredInstructors = computed(() => {
    return this.filteredInstructorsList().slice(0, this.instructorPickerLimit());
  });

  loadMoreInstructors(): void {
    this.instructorPickerLimit.update((limit) => limit + 40);
  }

  showAllInstructors(): void {
    this.instructorPickerLimit.set(this.filteredInstructorsList().length);
  }

  // Selected Instructor Objects for Preview Chips
  readonly selectedInstructorObjects = computed(() => {
    const codes = new Set(this.formInstructorCodes());
    return this.allInstructors().filter((i) => codes.has(i.INSTRUCTOR_CODE));
  });

  // Display value in the search input
  readonly courseDisplayValue = computed(() => {
    if (this.isInlineDropdownOpen()) {
      return this.inlineSearchQuery();
    }
    if (this.formCourseNo()) {
      const th = this.formCourseName();
      return th ? `${this.formCourseNo()} : ${th}` : this.formCourseNo();
    }
    return '';
  });

  private getBaseUrl(): string {
    return '/api/service/timetable';
  }

  ngOnInit(): void {
    this.loadActiveSemesterAndData();
    this.loadAllInstructors();
    this.loadDayOptions();
    this.loadTimeSlots();
  }

  loadActiveSemesterAndData(): void {
    this.isLoading.set(true);
    this.http.get<{ success: boolean; results: { STUDY_YEAR: string; STUDY_SEMESTER: string; STUDY_ACTIVE: string }[] }>('/api/service/yearsem/list').subscribe({
      next: (res) => {
        if (res && res.results && res.results.length > 0) {
          this.yearSemList.set(res.results);
          const currentKey = this.selectedYearSem();
          let target = res.results.find((y) => `${y.STUDY_YEAR}_${y.STUDY_SEMESTER}` === currentKey);
          if (!target) {
            target = res.results.find((y) => y.STUDY_ACTIVE === '1') || res.results[0];
          }
          if (target) {
            this.activeYear.set(target.STUDY_YEAR);
            this.activeSemester.set(target.STUDY_SEMESTER);
            this.selectedYearSem.set(`${target.STUDY_YEAR}_${target.STUDY_SEMESTER}`);
          }
        }
        this.loadClassList();
        this.loadAllInstructors();
        this.loadDayOptions();
        this.loadTimeSlots();
        this.loadRoomOptions();
      },
      error: () => {
        this.loadClassList();
        this.loadAllInstructors();
        this.loadDayOptions();
        this.loadTimeSlots();
        this.loadRoomOptions();
      },
    });
  }

  onYearSemChange(val: string): void {
    if (!val) return;
    this.selectedYearSem.set(val);
    const [year, sem] = val.split('_');
    this.activeYear.set(year);
    this.activeSemester.set(sem);
    this.selectedClassKeys.set([]);
    this.selectedRoomFilter.set('ALL');
    this.currentPage.set(1);
    this.loadClassList();
    this.loadAllInstructors();
    this.loadRoomOptions();
  }

  loadDayOptions(): void {
    this.http.get<{ success: boolean; results: ScheduleDayOption[] }>(`${this.getBaseUrl()}/days`).subscribe({
      next: (res) => {
        if (res && res.success && res.results && res.results.length > 0) {
          const list = res.results.filter((d) => d.code >= 1 && d.code <= 7);
          if (list.length > 0) {
            this.dayOptions.set(list);
          }
        }
      },
      error: () => {
        // Keep default fallback
      },
    });
  }

  loadTimeSlots(): void {
    this.http.get<{ success: boolean; results: ScheduleTimeOption[] }>(`${this.getBaseUrl()}/times`).subscribe({
      next: (res) => {
        if (res && res.success && res.results && res.results.length > 0) {
          const list = res.results.filter((t) => t.code >= 1 && t.code <= 7);
          if (list.length > 0) {
            this.timeOptions.set(list);
          }
        }
      },
      error: () => {
        // Fallback default remains in signal
      },
    });
  }

  loadRoomOptions(): void {
    this.http.get<{ success: boolean; results: { value: string; label: string; subLabel?: string }[] }>(`${this.getBaseUrl()}/rooms`).subscribe({
      next: (res) => {
        if (res && res.success && res.results && res.results.length > 0) {
          const list: SelectOption[] = res.results.map((r) => ({
            value: r.value,
            label: this.formatCleanRoomLabel(r.value, r.label),
            subLabel: undefined,
            icon: 'meeting_room',
          }));
          this.roomOptions.set(list);
        }
      },
      error: () => {
        // Keep existing options
      },
    });
  }

  loadClassList(): void {
    this.isLoading.set(true);
    this.selectedClassKeys.set([]);

    const year = this.activeYear();
    const sem = this.activeSemester();

    let url = `${this.getBaseUrl()}/list?year=${year}&semester=${sem}`;
    if (this.selectedDayFilter() !== null) {
      url += `&dayCode=${this.selectedDayFilter()}`;
    }

    this.http.get<{ success: boolean; results: ScheduleClassItem[] }>(url).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.success) {
          this.classList.set(res.results || []);
        } else {
          this.classList.set([]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error(err?.message || 'ไม่สามารถโหลดข้อมูลตารางสอนได้');
      },
    });
  }

  loadAllInstructors(callback?: () => void): void {
    this.isInstructorsLoading.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();
    this.http.get<{ success: boolean; results: InstructorItem[] }>(`${this.getBaseUrl()}/instructors?year=${year}&semester=${sem}`).subscribe({
      next: (res) => {
        this.isInstructorsLoading.set(false);
        if (res && res.success) {
          this.allInstructors.set(res.results || []);
        }
        if (callback) callback();
      },
      error: () => {
        this.isInstructorsLoading.set(false);
        if (callback) callback();
      },
    });
  }

  getClassKey(item: ScheduleClassItem): string {
    return `${item.STUDY_YEAR}_${item.STUDY_SEMESTER}_${item.COURSE_NO}_${item.DAY_CODE}_${item.TIME_CODE}_${item.ROOM_CODE || '-'}_${item.INSTR_GROUP || '0'}`;
  }

  isTimeCodeSelected(code: number): boolean {
    return this.formTimeCodes().includes(code);
  }

  toggleFormTimeCode(code: number): void {
    const current = [...this.formTimeCodes()];
    const idx = current.indexOf(code);
    if (idx >= 0) {
      if (current.length > 1) {
        current.splice(idx, 1);
      } else {
        this.toastService.warning('ต้องเลือกเวลาเรียนอย่างน้อย 1 คาบ');
        return;
      }
    } else {
      current.push(code);
    }
    current.sort((a, b) => a - b);
    this.formTimeCodes.set(current);
    this.formTimeCode.set(current[0]);
    this.checkInstructorConflicts();
    this.fetchSlotAvailableInstructors();
  }

  selectConsecutivePeriods(startCode: number, count: number): void {
    const newTimes: number[] = [];
    const validStart = Math.min(Math.max(1, startCode), 7);
    for (let i = 0; i < count; i++) {
      const t = validStart + i;
      if (t <= 7) newTimes.push(t);
    }
    if (newTimes.length === 0) newTimes.push(validStart);
    this.formTimeCodes.set(newTimes);
    this.formTimeCode.set(newTimes[0]);
    this.checkInstructorConflicts();
    this.fetchSlotAvailableInstructors();
  }

  getDayLabel(dayCode: number): string {
    const day = this.dayOptions().find((d) => d.code === Number(dayCode));
    return day ? (day.shortLabel || day.label) : `วัน ${dayCode}`;
  }

  getDayColorClass(dayCode: number): string {
    const day = this.dayOptions().find((d) => d.code === Number(dayCode));
    return day ? day.colorClass : 'day-default';
  }

  getTimePeriod(timeCode: number): string {
    const time = this.timeOptions().find((t) => Number(t.code) === Number(timeCode) || t.TIME_CODE === String(timeCode));
    return (time && time.period) ? time.period : `คาบ ${timeCode}`;
  }

  hasRoomConflict(item: ScheduleClassItem): boolean {
    if (!item.ROOM_CODE || item.ROOM_CODE === '-') return false;
    const list = this.classList();
    const itemCourse = (item.COURSE_NO || '').trim().toUpperCase();
    const itemRoom = (item.ROOM_CODE || '').trim().toUpperCase();

    return list.some((c) => {
      if (c === item) return false;
      const cCourse = (c.COURSE_NO || '').trim().toUpperCase();
      const cRoom = (c.ROOM_CODE || '').trim().toUpperCase();
      const sameSlot = c.DAY_CODE === item.DAY_CODE && c.TIME_CODE === item.TIME_CODE && cRoom === itemRoom;
      if (!sameSlot || cCourse === itemCourse) return false;

      // Check if they are paired courses
      const isPaired = (item.PAIRED_COURSES || []).some(
        (p) => (p.courseNo || '').trim().toUpperCase() === cCourse
      );
      return !isPaired;
    });
  }

  toggleSelectAll(): void {
    const visible = this.filteredClasses();
    if (this.isAllSelected()) {
      this.selectedClassKeys.set([]);
    } else {
      this.selectedClassKeys.set(visible.map((c) => this.getClassKey(c)));
    }
  }

  toggleSelectRow(key: string): void {
    const current = this.selectedClassKeys();
    if (current.includes(key)) {
      this.selectedClassKeys.set(current.filter((k) => k !== key));
    } else {
      this.selectedClassKeys.set([...current, key]);
    }
  }

  isRowSelected(key: string): boolean {
    return this.selectedClassKeys().includes(key);
  }

  async deleteClass(item: ScheduleClassItem): Promise<void> {
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

    const payload = {
      studyYear: item.STUDY_YEAR || this.activeYear(),
      studySemester: item.STUDY_SEMESTER || this.activeSemester(),
      courseNo: item.COURSE_NO,
      dayCode: item.DAY_CODE,
      timeCode: item.TIME_CODE,
      roomCode: item.ROOM_CODE,
      instrGroup: item.INSTR_GROUP,
      userInsert: this.authService.currentUser()?.email || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string }>(`${this.getBaseUrl()}/delete`, payload).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.toastService.success('ลบตารางสอนเรียบร้อยแล้ว');
          this.loadClassList();
        } else {
          this.toastService.error(res?.message || 'ลบไม่สำเร็จ');
        }
      },
      error: (err) => {
        this.toastService.error(err?.message || 'ลบไม่สำเร็จ');
      },
    });
  }

  async deleteBulk(): Promise<void> {
    const selectedKeys = this.selectedClassKeys();
    if (selectedKeys.length === 0) return;

    const confirmed = await this.confirmDialogService.confirm({
      title: 'ยืนยันการลบแบบกลุ่ม',
      message: `คุณต้องการลบตารางสอนที่เลือกจำนวน ${selectedKeys.length} รายการ ใช่หรือไม่?`,
      detail: 'ระบบจะสำรองประวัติการลบไว้ในตาราง HIS ให้อัตโนมัติ',
      confirmText: `ลบ ${selectedKeys.length} รายการ`,
      cancelText: 'ยกเลิก',
      variant: 'danger',
    });

    if (!confirmed) return;

    const visible = this.classList();
    const keySet = new Set(selectedKeys);
    const itemsToDelete = visible
      .filter((c) => keySet.has(this.getClassKey(c)))
      .map((c) => ({
        courseNo: c.COURSE_NO,
        dayCode: c.DAY_CODE,
        timeCode: c.TIME_CODE,
        roomCode: c.ROOM_CODE,
        instrGroup: c.INSTR_GROUP,
      }));

    this.isBulkDeleting.set(true);
    const payload = {
      studyYear: this.activeYear(),
      studySemester: this.activeSemester(),
      items: itemsToDelete,
      userInsert: this.authService.currentUser()?.email || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string; deletedCount?: number }>(`${this.getBaseUrl()}/delete-bulk`, payload).subscribe({
      next: (res) => {
        this.isBulkDeleting.set(false);
        if (res && res.success) {
          this.toastService.success(res.message || `ลบตารางสอน ${res.deletedCount} รายการ เรียบร้อยแล้ว`, 'ลบสำเร็จ');
          this.selectedClassKeys.set([]);
          this.loadClassList();
        } else {
          this.toastService.error(res?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
        }
      },
      error: (err) => {
        this.isBulkDeleting.set(false);
        this.toastService.error(err?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      },
    });
  }

  // Detail Modal Handlers
  openDetailModal(item: ScheduleClassItem): void {
    this.selectedClassDetail.set(item);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedClassDetail.set(null);
  }

  // Add / Edit Class Modal Handlers
  openAddModal(): void {
    this.formError.set('');
    this.instructorConflict.set(null);
    this.isEditMode.set(false);
    this.editingItem.set(null);
    this.formCourseNo.set('');
    this.formCourseName.set('');
    this.formCourseCredit.set(null);
    this.formDayCode.set(null);
    this.formTimeCode.set(null);
    this.formTimeCodes.set([]);
    this.formRoomCode.set('');
    this.formInstructorCodes.set([]);
    this.availabilitySlots.set([]);
    this.commonFreeSlots.set([]);
    this.inlineSearchQuery.set('');
    this.inlineSearchResults.set([]);
    this.isInlineDropdownOpen.set(false);
    this.isDrawerOpen.set(false);
    this.instructorPickerLimit.set(40);
    this.isAddModalOpen.set(true);

    if (!this.tourService.isTourCompleted('modal_add_timetable_tour_v2')) {
      setTimeout(() => {
        this.startModalTour(false);
      }, 400);
    }
  }

  openEditModal(item: ScheduleClassItem): void {
    this.formError.set('');
    this.instructorConflict.set(null);
    this.instructorPickerLimit.set(40);
    this.isEditMode.set(true);
    this.editingItem.set(item);

    this.formCourseNo.set((item.COURSE_NO || '').trim());
    this.formCourseName.set(item.COURSE_NAME_THAI || item.COURSE_NAME_ENG || '');
    this.formCourseCredit.set(item.CREDIT || null);
    this.formDayCode.set(item.DAY_CODE !== undefined && item.DAY_CODE !== null ? Number(item.DAY_CODE) : null);

    // ดึงคาบเรียนทั้งหมดที่เป็นวิชาเดียวกัน ในวันเดียวกัน
    const siblingTimeCodes = this.classList()
      .filter((c) =>
        (c.COURSE_NO || '').trim().toUpperCase() === (item.COURSE_NO || '').trim().toUpperCase() &&
        Number(c.DAY_CODE) === Number(item.DAY_CODE) &&
        (item.INSTR_GROUP == null || c.INSTR_GROUP === item.INSTR_GROUP)
      )
      .map((c) => Number(c.TIME_CODE))
      .filter((n) => !isNaN(n) && n > 0);

    const sortedTimes = Array.from(new Set(siblingTimeCodes.length > 0 ? siblingTimeCodes : [Number(item.TIME_CODE)])).sort((a, b) => a - b);
    this.formTimeCodes.set(sortedTimes);
    this.formTimeCode.set(sortedTimes[0]);
    this.formRoomCode.set((item.ROOM_CODE || '').trim());

    const instCodes = (item.INSTRUCTORS || []).map((i: any) => (i.INSTRUCTOR_CODE || '').toString().trim()).filter(Boolean);
    this.formInstructorCodes.set(instCodes);

    this.inlineSearchQuery.set('');
    this.inlineSearchResults.set([]);
    this.isInlineDropdownOpen.set(false);
    this.isDrawerOpen.set(false);
    this.isAddModalOpen.set(true);

    if (instCodes.length > 0) {
      this.fetchInstructorAvailability();
    } else {
      this.availabilitySlots.set([]);
      this.commonFreeSlots.set([]);
    }

    this.checkInstructorConflicts();
    this.fetchSlotAvailableInstructors();
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
    this.isEditMode.set(false);
    this.editingItem.set(null);
    this.isDrawerOpen.set(false);
    this.isInlineDropdownOpen.set(false);
    this.formError.set('');
    this.instructorConflict.set(null);
    this.slotAvailableInstructorCodes.set(new Set());
    this.slotInstructorsStatusMap.set({});
  }

  onFormDayChange(val: any): void {
    this.formDayCode.set(val);
    this.checkInstructorConflicts();
    this.fetchSlotAvailableInstructors();
  }

  onFormTimeChange(val: any): void {
    this.formTimeCode.set(val);
    this.checkInstructorConflicts();
  }

  // Feature 1: Instructor Conflict Check
  checkInstructorConflicts(): void {
    const day = this.formDayCode();
    const time = this.formTimeCode();
    const instCodes = this.formInstructorCodes();
    const year = this.activeYear();
    const sem = this.activeSemester();

    if (day === null || time === null || instCodes.length === 0 || !year || !sem) {
      this.instructorConflict.set(null);
      return;
    }

    const exclude = this.isEditMode() ? this.formCourseNo() : '';
    const codesParam = encodeURIComponent(instCodes.join(','));

    this.http
      .get<{ success: boolean; hasConflict: boolean; conflicts: any[] }>(
        `${this.getBaseUrl()}/check-instructor-conflicts?year=${year}&semester=${sem}&dayCode=${day}&timeCode=${time}&instructorCodes=${codesParam}&excludeCourseNo=${exclude}`
      )
      .subscribe({
        next: (res) => {
          if (res && res.success && res.hasConflict && res.conflicts.length > 0) {
            this.instructorConflict.set(res.conflicts[0].message);
          } else {
            this.instructorConflict.set(null);
          }
        },
        error: () => {
          this.instructorConflict.set(null);
        },
      });
  }

  // Feature 2: Smart Slot Recommender
  getSlotRecommendations(): void {
    const instCodes = this.formInstructorCodes();
    const year = this.activeYear();
    const sem = this.activeSemester();
    const prefRoom = this.formRoomCode();

    if (!year || !sem) return;

    this.isRecommending.set(true);
    const codesParam = encodeURIComponent(instCodes.join(','));
    const url = `${this.getBaseUrl()}/recommend-slots?year=${year}&semester=${sem}&instructorCodes=${codesParam}&preferredRoom=${encodeURIComponent(prefRoom || '')}`;

    this.http.get<{ success: boolean; recommendations: any[] }>(url).subscribe({
      next: (res) => {
        this.isRecommending.set(false);
        if (res && res.success && res.recommendations && res.recommendations.length > 0) {
          this.recommendations.set(res.recommendations);
          this.isRecommendModalOpen.set(true);
        } else {
          this.toastService.info('ไม่พบคาบว่างและห้องว่างที่ตรงกันในระบบ');
        }
      },
      error: (err) => {
        this.isRecommending.set(false);
        this.toastService.error(err?.error?.message || 'เกิดข้อผิดพลาดในการค้นหา');
      },
    });
  }

  applyRecommendation(rec: any, chosenRoom?: string): void {
    this.formDayCode.set(rec.dayCode);
    this.formTimeCode.set(rec.timeCode);
    const roomToUse =
      chosenRoom ||
      rec.suggestedRoom ||
      (rec.availableRooms && (rec.availableRooms[0]?.roomCode || rec.availableRooms[0])) ||
      '';
    if (roomToUse) {
      this.formRoomCode.set(roomToUse);
    }
    this.isRecommendModalOpen.set(false);
    this.toastService.success(`เลือก ${rec.dayLabel} คาบที่ ${rec.timeCode} (ห้อง ${roomToUse || '-'}) เรียบร้อยแล้ว`);
    this.checkInstructorConflicts();
  }

  closeRecommendModal(): void {
    this.isRecommendModalOpen.set(false);
  }

  getPairedCoursesTooltip(pairedList?: any[]): string {
    if (!pairedList || pairedList.length === 0) return '';
    return pairedList
      .map((p) => `${p.courseNo} (${p.courseNameThai || ''})`.trim())
      .join(', ');
  }

  // Feature 3: Clone Timetable
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
      `${this.getBaseUrl()}/clone-semester`,
      payload
    ).subscribe({
      next: (res) => {
        this.isCloning.set(false);
        if (res && res.success) {
          this.toastService.success(res.message || 'คัดลอกตารางสอนสำเร็จ');
          this.closeCloneModal();
          this.loadClassList();
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

  // Feature 4: Export to Excel (CSV with UTF-8 BOM)
  exportToExcel(): void {
    const classes = this.classList();
    if (classes.length === 0) {
      this.toastService.info('ไม่มีข้อมูลตารางสอนสำหรับส่งออก');
      return;
    }

    const headers = ['รหัสวิชา', 'ชื่อวิชา', 'หน่วยกิต', 'วันเรียน', 'คาบเรียน', 'เวลาเรียน', 'ห้องเรียน', 'อาจารย์ผู้สอน'];
    const dayNames: { [key: number]: string } = {
      1: 'วันจันทร์', 2: 'วันอังคาร', 3: 'วันพุธ', 4: 'วันพฤหัสบดี',
      5: 'วันศุกร์', 6: 'วันเสาร์', 7: 'วันอาทิตย์'
    };
    const timeLabels: { [key: number]: string } = {
      1: '07:30 - 09:20', 2: '09:30 - 11:20', 3: '11:30 - 13:20',
      4: '13:30 - 15:20', 5: '15:30 - 17:20', 6: '17:30 - 19:20', 7: '19:30 - 21:20'
    };

    const rows = classes.map((c: ScheduleClassItem) => {
      const day = dayNames[Number(c.DAY_CODE)] || `วันรหัส ${c.DAY_CODE}`;
      const time = timeLabels[Number(c.TIME_CODE)] || `คาบ ${c.TIME_CODE}`;
      const inst = (c.INSTRUCTORS || [])
        .map((i: any) => `${i.RANK_NAME_THAI_S || ''}${i.INSTRUCTOR_NAME_THAI || i.INSTRUCTOR_CODE}`)
        .join('; ');

      return [
        `"${c.COURSE_NO || ''}"`,
        `"${(c.COURSE_NAME_THAI || c.COURSE_NAME_ENG || '').replace(/"/g, '""')}"`,
        c.CREDIT || '',
        `"${day}"`,
        `"คาบที่ ${c.TIME_CODE}"`,
        `"${time}"`,
        `"${c.ROOM_CODE || '-'}"`,
        `"${inst.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ตารางสอน_ปี${this.activeYear()}_ภาค${this.activeSemester()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.success(`ส่งออกตารางสอนเรียบร้อยแล้ว (${classes.length} รายการ)`);
  }

  startModalTour(force: boolean = false): void {
    const initialSelectedCodes = [...this.formInstructorCodes()];
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
        targetSelector: '.form-section:has(.instructor-picker-container), .instructor-picker-container',
        title: '2. เลือกอาจารย์ผู้สอนในคาบนี้',
        description: 'ติ๊กเลือกอาจารย์ผู้สอน (เลือกได้มากกว่า 1 ท่าน) เมื่อเลือกแล้ว ระบบจะคำนวณวันและเวลาว่างของอาจารย์ให้อัตโนมัติ!',
        icon: 'person_add',
        position: 'top',
        beforeShow: async () => {
          if (this.formInstructorCodes().length === 0 && hasInstructors) {
            autoSelectedForTour = true;
            this.formInstructorCodes.set([availableInstructors[0].INSTRUCTOR_CODE]);
            this.fetchInstructorAvailability();
            await new Promise((r) => setTimeout(r, 250));
          }
        },
      },
      {
        targetSelector: hasInstructors
          ? '.modal-availability-companion-card, .companion-inner-content'
          : '.form-section:has(.instructor-picker-container), .modal-main-form-card',
        title: '3. แผงเวลาว่างของอาจารย์ (Smart Availability)',
        description: hasInstructors
          ? 'เมื่อเลือกอาจารย์ แผงทางขวานี้จะคลี่ออกมาแสดงคาบที่อาจารย์ว่างสอนตาม มร.30 และเช็ควิชาที่ติดสอนให้ทันที สามารถกดปุ่ม "เลือก" เพื่อใส่วันและเวลาลงฟอร์มอัตโนมัติ'
          : 'เมื่อเลือกอาจารย์ผู้สอน แผงด้านขวาจะคลี่ออกมาแสดงคาบว่างของอาจารย์ตาม มร.30 ให้อัตโนมัติ',
        icon: 'event_available',
        position: hasInstructors ? 'left' : 'top',
        beforeShow: async () => {
          if (this.formInstructorCodes().length === 0 && hasInstructors) {
            autoSelectedForTour = true;
            this.formInstructorCodes.set([availableInstructors[0].INSTRUCTOR_CODE]);
            this.fetchInstructorAvailability();
          }
          await new Promise((r) => setTimeout(r, 350));
        },
      },
      {
        targetSelector: '.form-grid-2',
        title: '4. ระบุวันเรียน และ ห้องเรียน',
        description: 'เลือกวันเรียน และค้นหา/เลือกห้องเรียนที่ต้องการจัดสอน โดยระบบจะตรวจสอบการใช้ห้องซ้ำซ้อนให้อัตโนมัติ',
        icon: 'meeting_room',
        position: 'bottom',
      },
      {
        targetSelector: '.period-picker-group',
        title: '5. คาบเวลาเรียน (Multi-Period)',
        description: 'คลิกเลือกคาบเวลาที่ต้องการจัดสอน สามารถเลือกหลายคาบติดกัน หรือคลิกปุ่มทางลัด (1 คาบ 2 ชม., 2 คาบ 4 ชม., 3 คาบ 6 ชม.) ได้อย่างรวดเร็ว',
        icon: 'schedule',
        position: 'top',
      },
      {
        targetSelector: '.btn-recommend-slots',
        title: '6. ระบบแนะนำคาบและห้องว่างอัจฉริยะ',
        description: 'หากไม่แน่ใจว่าจะลงคาบไหน สามารถคลิกปุ่มนี้เพื่อให้ระบบวิเคราะห์และแนะนำคาบและห้องเรียนที่อาจารย์ทุกคนว่างตรงกันให้ทันที',
        icon: 'lightbulb',
        position: 'bottom',
      },
      {
        targetSelector: '.modal-main-form-card .modal-footer .btn-primary, .modal-footer .btn-primary',
        title: '7. บันทึกข้อมูลตารางสอน',
        description: 'เมื่อข้อมูลครบถ้วนและไม่มีข้อขัดแย้ง ให้คลิกปุ่ม "บันทึกข้อมูลตารางสอน" เพื่อบันทึกลงฐานข้อมูล',
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

    this.tourService.startTour('modal_add_timetable_tour_v2', steps, force, onFinished);
  }

  triggerModalTour(force: boolean = false): void {
    this.startModalTour(force);
  }

  // Inline Search Handlers (Matching tab-paired-courses)
  openInlineDropdown(): void {
    this.isInlineDropdownOpen.set(true);
    if (this.inlineSearchResults().length === 0) {
      this.executeInlineCourseSearch(this.inlineSearchQuery() || this.formCourseNo() || 'A');
    }
  }

  closeInlineDropdown(): void {
    this.isInlineDropdownOpen.set(false);
  }

  private readonly elementRef = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isInlineDropdownOpen()) {
      const target = event.target as HTMLElement;
      if (target && !target.closest('.inline-picker-group')) {
        this.isInlineDropdownOpen.set(false);
      }
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.isInlineDropdownOpen()) {
      this.isInlineDropdownOpen.set(false);
    }
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

    let url = `${this.getBaseUrl()}/search-ugb?year=${year}&semester=${sem}`;
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
    this.formCourseNo.set(c.COURSE_NO);
    this.formCourseName.set(c.COURSE_NAME_THAI);
    this.formCourseCredit.set(c.CREDIT ?? null);
    this.inlineSearchQuery.set('');
    this.isInlineDropdownOpen.set(false);
  }

  clearCourseSelection(): void {
    this.formCourseNo.set('');
    this.formCourseName.set('');
    this.formCourseCredit.set(null);
    this.inlineSearchQuery.set('');
    this.formDayCode.set(null);
    this.formTimeCode.set(null);
    this.formRoomCode.set('');
    this.formInstructorCodes.set([]);
    this.availabilitySlots.set([]);
    this.commonFreeSlots.set([]);
  }

  // Right-Side Alphabetical Drawer Handlers (Matching tab-paired-courses)
  openDrawer(): void {
    this.isDrawerOpen.set(true);
    this.drawerCodeQuery.set('');
    this.drawerNameQuery.set('');

    if (this.letters().length === 0) {
      this.loadFirstLetters();
    } else if (this.selectedLetter() && this.selectedPrefix()) {
      this.loadDrawerCourses(this.selectedPrefix());
    }
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  loadFirstLetters(): void {
    this.isLettersLoading.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();
    this.http.get<{ success: boolean; results: string[] }>(`${this.getBaseUrl()}/letters?year=${year}&semester=${sem}`).subscribe({
      next: (res) => {
        this.isLettersLoading.set(false);
        if (res && res.success) {
          this.letters.set(res.results || []);
          if (this.letters().length > 0 && !this.selectedLetter()) {
            this.selectLetter(this.letters()[0]);
          }
        }
      },
      error: () => {
        this.isLettersLoading.set(false);
      },
    });
  }

  selectLetter(letter: string): void {
    this.selectedLetter.set(letter);
    this.selectedPrefix.set('');
    this.drawerCourses.set([]);
    this.loadPrefixGroups(letter);
  }

  loadPrefixGroups(letter: string): void {
    this.isPrefixesLoading.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();
    this.http.get<{ success: boolean; results: CoursePrefixOption[] }>(`${this.getBaseUrl()}/prefixes/${letter}?year=${year}&semester=${sem}`).subscribe({
      next: (res) => {
        this.isPrefixesLoading.set(false);
        if (res && res.success) {
          this.prefixes.set(res.results || []);
          if (this.prefixes().length > 0) {
            this.selectPrefix(this.prefixes()[0].PREFIX_NAME);
          }
        }
      },
      error: () => {
        this.isPrefixesLoading.set(false);
      },
    });
  }

  selectPrefix(prefix: string): void {
    this.selectedPrefix.set(prefix);
    this.loadDrawerCourses(prefix);
  }

  loadDrawerCourses(prefix: string): void {
    this.isDrawerCoursesLoading.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();
    this.http.get<{ success: boolean; results: CourseOption[] }>(`${this.getBaseUrl()}/search-ugb?year=${year}&semester=${sem}&prefix=${prefix}`).subscribe({
      next: (res) => {
        this.isDrawerCoursesLoading.set(false);
        if (res && res.success) {
          this.drawerCourses.set(res.results || []);
        }
      },
      error: () => {
        this.isDrawerCoursesLoading.set(false);
      },
    });
  }

  onDrawerCodeSearchChange(val: string): void {
    this.drawerCodeQuery.set(val);
    if (val.trim().length >= 2 && !this.selectedPrefix()) {
      this.triggerDrawerSearch(val);
    }
  }

  onDrawerNameSearchChange(val: string): void {
    this.drawerNameQuery.set(val);
    if (val.trim().length >= 2 && !this.selectedPrefix()) {
      this.triggerDrawerSearch(val);
    }
  }

  triggerDrawerSearch(val: string): void {
    this.isDrawerCoursesLoading.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();
    this.http.get<{ success: boolean; results: CourseOption[] }>(`${this.getBaseUrl()}/search-ugb?year=${year}&semester=${sem}&search=${encodeURIComponent(val.trim())}`).subscribe({
      next: (res) => {
        this.isDrawerCoursesLoading.set(false);
        if (res && res.success) {
          this.drawerCourses.set(res.results || []);
        }
      },
      error: () => {
        this.isDrawerCoursesLoading.set(false);
      },
    });
  }

  selectCourseFromDrawer(c: CourseOption): void {
    if (!c || !c.COURSE_NO) return;
    const cleanCourseNo = c.COURSE_NO.trim();
    this.formCourseNo.set(cleanCourseNo);
    this.formCourseName.set(c.COURSE_NAME_THAI || '');
    this.formCourseCredit.set(c.CREDIT ?? null);
    this.inlineSearchQuery.set('');
    this.isInlineDropdownOpen.set(false);
    this.closeDrawer();
  }

  // Instructor Selection & Availability Handlers
  fetchInstructorAvailability(): void {
    const codes = this.formInstructorCodes();
    if (codes.length === 0) {
      this.availabilitySlots.set([]);
      this.commonFreeSlots.set([]);
      return;
    }

    this.isAvailabilityLoading.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();
    const codesParam = encodeURIComponent(codes.join(','));
    const currentCourse = this.formCourseNo().trim();
    let url = `${this.getBaseUrl()}/instructor-availability?year=${year}&semester=${sem}&instructorCodes=${codesParam}`;
    if (currentCourse) {
      url += `&courseNo=${encodeURIComponent(currentCourse)}`;
    }

    this.http
      .get<{ success: boolean; totalInstructors: number; hasRu30Schedule?: boolean; slots: InstructorSlotAvailability[]; commonFreeSlots: InstructorSlotAvailability[] }>(
        url
      )
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
    const day = this.formDayCode();
    const times = this.formTimeCodes().length > 0 ? this.formTimeCodes() : (this.formTimeCode() !== null ? [this.formTimeCode()!] : []);
    if (day === null || times.length === 0) {
      this.slotAvailableInstructorCodes.set(new Set());
      this.slotInstructorsStatusMap.set({});
      return;
    }

    this.isCheckingSlotInstructors.set(true);
    const year = this.activeYear();
    const sem = this.activeSemester();
    const timesParam = encodeURIComponent(times.join(','));
    const currentCourse = encodeURIComponent((this.formCourseNo() || '').trim());
    const url = `${this.getBaseUrl()}/slot-available-instructors?year=${year}&semester=${sem}&dayCode=${day}&timeCodes=${timesParam}&courseNo=${currentCourse}`;

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

  toggleInstructorCode(code: string): void {
    const clean = (code || '').toString().trim();
    const current = this.formInstructorCodes();
    if (current.includes(clean)) {
      this.formInstructorCodes.set(current.filter((c) => c !== clean));
    } else {
      this.formInstructorCodes.set([...current, clean]);
    }
    this.fetchInstructorAvailability();
  }

  isInstructorSelected(code: string): boolean {
    return this.formInstructorCodes().includes((code || '').toString().trim());
  }

  removeInstructor(code: string): void {
    this.formInstructorCodes.set(this.formInstructorCodes().filter((c) => c !== code));
    this.fetchInstructorAvailability();
  }

  clearInstructorSelection(): void {
    this.formInstructorCodes.set([]);
    this.availabilitySlots.set([]);
    this.commonFreeSlots.set([]);
  }

  applyAvailableSlot(slot: InstructorSlotAvailability): void {
    const isCurrentlySelected = this.formDayCode() === slot.dayCode && this.isTimeCodeSelected(slot.timeCode);

    if (this.formDayCode() !== null && this.formDayCode() !== undefined && this.formDayCode() !== slot.dayCode) {
      const dayLabel = this.dayOptions().find((d) => d.code === this.formDayCode())?.label || `วัน ${this.formDayCode()}`;
      this.toastService.warning('ไม่สามารถเลือกคาบเรียนข้ามวันในหน้านี้ได้', {
        description: `วิชานี้เลือก${dayLabel}อยู่ หากต้องการเปลี่ยนวัน กรุณาเลือกวันเรียนที่ฟอร์มด้านซ้าย หรือเลือกคาบในวันเดียวกัน`,
      });
      return;
    }

    this.formDayCode.set(slot.dayCode);

    if (isCurrentlySelected) {
      const current = this.formTimeCodes();
      if (current.length > 1) {
        this.toggleFormTimeCode(slot.timeCode);
        this.toastService.info(`ยกเลิกคาบที่ ${slot.timeCode} แล้ว`);
      } else {
        this.toastService.warning('ต้องเลือกอย่างน้อย 1 คาบเวลา');
      }
    } else {
      const current = [...this.formTimeCodes()];
      if (!current.includes(slot.timeCode)) {
        current.push(slot.timeCode);
        current.sort((a, b) => a - b);
        this.formTimeCodes.set(current);
        this.formTimeCode.set(current[0]);
        this.fetchSlotAvailableInstructors();
        this.toastService.success(`เลือกวัน ${slot.dayLabel} คาบที่ ${slot.timeCode} (${slot.period}) เรียบร้อยแล้ว`);
      }
    }
  }

  saveScheduleClass(): void {
    if (!this.formCourseNo()) {
      this.formError.set('กรุณาเลือกหรือระบุรหัสวิชา');
      return;
    }
    if (this.formDayCode() === null) {
      this.formError.set('กรุณาเลือกวันเรียน');
      return;
    }
    const times = this.formTimeCodes().length > 0 ? this.formTimeCodes() : (this.formTimeCode() !== null ? [this.formTimeCode()!] : []);
    if (times.length === 0) {
      this.formError.set('กรุณาเลือกเวลาเรียนอย่างน้อย 1 คาบ');
      return;
    }
    if (!this.formRoomCode() || !this.formRoomCode().trim()) {
      this.formError.set('กรุณาเลือกหรือระบุห้องเรียน');
      this.toastService.error(this.formError());
      return;
    }
    if (!this.isSelectedSlotAvailableForInstructors()) {
      const reason = this.slotUnavailabilityReason();
      this.formError.set(`ไม่สามารถบันทึกได้: อาจารย์ไม่ว่างในคาบนี้ (${reason})`);
      this.toastService.error(this.formError());
      return;
    }

    this.formError.set('');
    this.isSaving.set(true);

    const isEdit = this.isEditMode();
    const endpoint = isEdit ? `${this.getBaseUrl()}/update` : `${this.getBaseUrl()}/add`;

    const payload = {
      studyYear: this.activeYear(),
      studySemester: this.activeSemester(),
      courseNo: this.formCourseNo(),
      dayCode: this.formDayCode(),
      timeCode: times[0],
      timeCodes: times,
      roomCode: this.formRoomCode(),
      instructorCodes: this.formInstructorCodes(),
      userInsert: this.authService.currentUser()?.email || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string }>(endpoint, payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res && res.success) {
          this.toastService.success(res.message || (isEdit ? 'แก้ไขข้อมูลตารางสอนเรียบร้อยแล้ว' : 'บันทึกข้อมูลตารางสอนเรียบร้อยแล้ว'));
          this.closeAddModal();
          this.loadClassList();
        } else {
          this.formError.set(res?.message || 'เกิดข้อผิดพลาดในการบันทึก');
          this.toastService.error(this.formError());
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this.formError.set(err?.error?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึก');
        this.toastService.error(this.formError());
      },
    });
  }
}
