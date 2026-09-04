import { Component, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CustomSelectComponent, SelectOption } from '../../common/custom-select/custom-select';
import { SkeletonComponent } from '../../common/skeleton/skeleton';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { TabLockService } from '../../../services/tab-lock.service';

export interface InstructorMeta {
  INSTRUCTOR_CODE: string;
  INSTRUCTOR_NAME_THAI?: string;
  INSTRUCTOR_NAME_ENG?: string;
  RANK_NAME_THAI_S?: string;
  RANK_NAME_THAI_L?: string;
}

export interface ScheduleClassItem {
  STUDY_YEAR: string;
  STUDY_SEMESTER: string;
  COURSE_NO: string;
  DAY_CODE: number;
  TIME_CODE: number;
  ROOM_CODE: string;
  INSTR_GROUP?: number;
  COURSE_NAME_THAI?: string;
  COURSE_NAME_ENG?: string;
  CREDIT?: number;
  INSTRUCTORS?: InstructorMeta[];
  PAIRED_COURSES?: any[];
  HAS_PAIRED_COURSES?: boolean;
  isMoved?: boolean;
  originalRoomCode?: string;
  originalTimeCode?: number;
  originalDayCode?: number;
}

export interface SlotMoveRecord {
  courseNo: string;
  oldDayCode: number;
  oldTimeCode: number;
  newDayCode: number;
  newTimeCode: number;
  oldRoomCode: string;
  newRoomCode: string;
  instrGroup?: number;
}

export interface DayOption {
  code: number;
  label: string;
  shortLabel: string;
  colorClass: string;
  accentColor: string;
}

export interface TimeSlotConfig {
  code: number;
  label: string;
  period: string;
  start: string;
  end: string;
}

export interface RoomSlotCell {
  timeCode: number;
  config: TimeSlotConfig;
  classItem: ScheduleClassItem | null;
  isOccupied: boolean;
  isDropHovered: boolean;
}

@Component({
  selector: 'app-tab-room-compare',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent, SkeletonComponent],
  templateUrl: './tab-room-compare.html',
  styleUrl: './tab-room-compare.css',
})
export class TabRoomCompareComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly tabLockService = inject(TabLockService);

  constructor() {
    effect(() => {
      const hasPending = this.pendingMoves().length > 0;
      if (hasPending) {
        this.tabLockService.lock(
          'มีการจัดตารางเทียบ 2 ห้องที่ยังไม่ได้บันทึก กรุณากด "กดยืนยันบันทึกข้อมูล" หรือ "ยกเลิกที่ย้าย" ก่อนเปลี่ยนแท็บ'
        );
      } else {
        this.tabLockService.unlock();
      }
    });
  }

  ngOnDestroy(): void {
    this.tabLockService.unlock();
  }

  private getBaseUrl(): string {
    return '/api/service/timetable';
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

  // Independent Day Navigation for Left & Right Rooms
  readonly days: DayOption[] = [
    { code: 1, label: 'วันจันทร์', shortLabel: 'จันทร์', colorClass: 'day-mon', accentColor: '#eab308' },
    { code: 2, label: 'วันอังคาร', shortLabel: 'อังคาร', colorClass: 'day-tue', accentColor: '#ec4899' },
    { code: 3, label: 'วันพุธ', shortLabel: 'พุธ', colorClass: 'day-wed', accentColor: '#10b981' },
    { code: 4, label: 'วันพฤหัสบดี', shortLabel: 'พฤหัสบดี', colorClass: 'day-thu', accentColor: '#f97316' },
    { code: 5, label: 'วันศุกร์', shortLabel: 'ศุกร์', colorClass: 'day-fri', accentColor: '#06b6d4' },
    { code: 6, label: 'วันเสาร์', shortLabel: 'เสาร์', colorClass: 'day-sat', accentColor: '#8b5cf6' },
    { code: 7, label: 'วันอาทิตย์', shortLabel: 'อาทิตย์', colorClass: 'day-sun', accentColor: '#ef4444' },
  ];
  readonly selectedDayLeft = signal<number>(1);
  readonly selectedDayRight = signal<number>(1);

  // Time Slot Definitions (Periods 1 to 7)
  readonly timeSlots: TimeSlotConfig[] = [
    { code: 1, label: 'คาบที่ 1', period: '07:30 - 09:20', start: '07:30', end: '09:20' },
    { code: 2, label: 'คาบที่ 2', period: '09:30 - 11:20', start: '09:30', end: '11:20' },
    { code: 3, label: 'คาบที่ 3', period: '11:30 - 13:20', start: '11:30', end: '13:20' },
    { code: 4, label: 'คาบที่ 4', period: '13:30 - 15:20', start: '13:30', end: '15:20' },
    { code: 5, label: 'คาบที่ 5', period: '15:30 - 17:20', start: '15:30', end: '17:20' },
    { code: 6, label: 'คาบที่ 6', period: '17:30 - 19:20', start: '17:30', end: '19:20' },
    { code: 7, label: 'คาบที่ 7', period: '19:30 - 21:20', start: '19:30', end: '21:20' },
  ];

  // Room Select Options (Clean labels: "ห้อง 1", "ห้อง 2", etc.)
  readonly roomOptions = signal<SelectOption[]>([]);
  readonly selectedRoomLeft = signal<string>('');
  readonly selectedRoomRight = signal<string>('');

  // Class Data for Current Day
  readonly allClassesForDay = signal<ScheduleClassItem[]>([]);
  readonly originalClassesForDay = signal<ScheduleClassItem[]>([]);
  readonly pendingMoves = signal<SlotMoveRecord[]>([]);

  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  // Drag & Drop State
  readonly draggedItem = signal<{
    item: ScheduleClassItem;
    fromRoom: string;
    fromTime: number;
    fromDay: number;
  } | null>(null);

  readonly hoveredDropTarget = signal<{
    targetRoom: string;
    targetTime: number;
  } | null>(null);

  // Detail Modal State
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly selectedClassDetail = signal<ScheduleClassItem | null>(null);

  // Draft Moves Popover State
  readonly isDraftListOpen = signal<boolean>(false);

  // Computed Slots for Left Room
  readonly leftRoomSlots = computed<RoomSlotCell[]>(() => {
    const room = this.selectedRoomLeft();
    const day = this.selectedDayLeft();
    const list = this.allClassesForDay().filter(
      (c) => (c.ROOM_CODE || '').trim().toUpperCase() === room.trim().toUpperCase() && Number(c.DAY_CODE) === day
    );
    const hovered = this.hoveredDropTarget();

    return this.timeSlots.map((config) => {
      const match = list.find((c) => Number(c.TIME_CODE) === config.code) || null;
      const isHovered =
        hovered !== null &&
        hovered.targetRoom.trim().toUpperCase() === room.trim().toUpperCase() &&
        hovered.targetTime === config.code;

      return {
        timeCode: config.code,
        config,
        classItem: match,
        isOccupied: match !== null,
        isDropHovered: isHovered,
      };
    });
  });

  // Computed Slots for Right Room
  readonly rightRoomSlots = computed<RoomSlotCell[]>(() => {
    const room = this.selectedRoomRight();
    const day = this.selectedDayRight();
    const list = this.allClassesForDay().filter(
      (c) => (c.ROOM_CODE || '').trim().toUpperCase() === room.trim().toUpperCase() && Number(c.DAY_CODE) === day
    );
    const hovered = this.hoveredDropTarget();

    return this.timeSlots.map((config) => {
      const match = list.find((c) => Number(c.TIME_CODE) === config.code) || null;
      const isHovered =
        hovered !== null &&
        hovered.targetRoom.trim().toUpperCase() === room.trim().toUpperCase() &&
        hovered.targetTime === config.code;

      return {
        timeCode: config.code,
        config,
        classItem: match,
        isOccupied: match !== null,
        isDropHovered: isHovered,
      };
    });
  });

  readonly hasChanges = computed(() => this.pendingMoves().length > 0);

  // Stats for Left Room
  readonly statsLeft = computed(() => {
    const slots = this.leftRoomSlots().filter((s) => s.isOccupied && s.classItem);
    const totalCredits = slots.reduce((acc, s) => acc + (s.classItem?.CREDIT || 0), 0);
    return { count: slots.length, credits: totalCredits };
  });

  // Stats for Right Room
  readonly statsRight = computed(() => {
    const slots = this.rightRoomSlots().filter((s) => s.isOccupied && s.classItem);
    const totalCredits = slots.reduce((acc, s) => acc + (s.classItem?.CREDIT || 0), 0);
    return { count: slots.length, credits: totalCredits };
  });

  ngOnInit(): void {
    this.loadYearSemesters();
  }

  // Format clean room label: "ห้อง 1", "ห้อง 2", etc.
  private formatCleanRoomLabel(code: string, detail?: string): string {
    const d = (detail || '').trim();
    const c = (code || '').trim();

    if (d) {
      let cleaned = d;
      if (cleaned.includes(' : ')) {
        cleaned = cleaned.split(' : ')[1]?.trim() || cleaned;
      }
      return cleaned.replace(/^(ห้อง\s*)+/gi, 'ห้อง ').trim();
    }
    if (c.includes(' : ')) {
      const cleaned = c.split(' : ')[1]?.trim() || c;
      return cleaned.replace(/^(ห้อง\s*)+/gi, 'ห้อง ').trim();
    }
    if (/^\d+$/.test(c)) {
      return `ห้อง ${c}`;
    }
    return c.replace(/^(ห้อง\s*)+/gi, 'ห้อง ').trim();
  }

  loadYearSemesters(): void {
    this.http.get<{ success: boolean; results: { STUDY_YEAR: string; STUDY_SEMESTER: string; STUDY_ACTIVE: string }[] }>('/api/service/yearsem/list').subscribe({
      next: (res) => {
        if (res && res.results && res.results.length > 0) {
          this.yearSemList.set(res.results);
          const active = res.results.find((r) => r.STUDY_ACTIVE === '1') || res.results[0];
          this.activeYear.set(active.STUDY_YEAR);
          this.activeSemester.set(active.STUDY_SEMESTER);
          this.selectedYearSem.set(`${active.STUDY_YEAR}_${active.STUDY_SEMESTER}`);
        }
        this.loadRooms();
      },
      error: () => {
        this.loadRooms();
      },
    });
  }

  loadRooms(): void {
    this.http.get<{ success: boolean; results: { value: string; label: string; subLabel?: string }[] }>(
      `${this.getBaseUrl()}/rooms`
    ).subscribe({
      next: (res) => {
        if (res && res.success && res.results && res.results.length > 0) {
          const roomSet = new Set<string>();
          const options: SelectOption[] = [];

          for (const r of res.results) {
            const code = String(r.value || '').trim();
            if (code && !roomSet.has(code.toUpperCase())) {
              roomSet.add(code.toUpperCase());
              options.push({
                value: code,
                label: this.formatCleanRoomLabel(code, r.label),
                icon: 'meeting_room',
              });
            }
          }

          options.sort((a, b) => {
            return String(a.label).localeCompare(String(b.label), 'th', { numeric: true });
          });

          this.roomOptions.set(options);

          // Select default 2 distinct rooms
          if (options.length > 0) {
            if (!this.selectedRoomLeft() || !options.some((o) => o.value === this.selectedRoomLeft())) {
              this.selectedRoomLeft.set(options[0].value);
            }
            if (
              !this.selectedRoomRight() ||
              !options.some((o) => o.value === this.selectedRoomRight()) ||
              this.selectedRoomRight() === this.selectedRoomLeft()
            ) {
              const secondRoom = options.length > 1 ? options[1].value : options[0].value;
              this.selectedRoomRight.set(secondRoom);
            }
          }
        }
        this.loadScheduleClasses();
      },
      error: () => {
        this.loadScheduleClasses();
      },
    });
  }

  loadScheduleClasses(): void {
    const year = this.activeYear();
    const sem = this.activeSemester();

    if (!year || !sem) return;

    this.isLoading.set(true);
    const url = `${this.getBaseUrl()}/list?year=${encodeURIComponent(year)}&semester=${encodeURIComponent(sem)}`;

    this.http.get<{ success: boolean; results: ScheduleClassItem[] }>(url).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.success) {
          const list = (res.results || []).map((c) => ({
            ...c,
            originalRoomCode: c.ROOM_CODE,
            originalTimeCode: c.TIME_CODE,
            originalDayCode: c.DAY_CODE,
            isMoved: false,
          }));
          this.allClassesForDay.set(list);
          this.originalClassesForDay.set(JSON.parse(JSON.stringify(list)));
          this.pendingMoves.set([]);
        } else {
          this.allClassesForDay.set([]);
          this.originalClassesForDay.set([]);
          this.pendingMoves.set([]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.error(err?.message || 'ไม่สามารถโหลดข้อมูลตารางสอนได้');
      },
    });
  }

  selectDayLeft(dayCode: number): void {
    this.selectedDayLeft.set(dayCode);
  }

  selectDayRight(dayCode: number): void {
    this.selectedDayRight.set(dayCode);
  }

  async onYearSemChange(val: string): Promise<void> {
    if (!val) return;
    if (this.hasChanges()) {
      const confirmed = await this.confirmDialogService.confirm({
        title: 'มีการแก้ไขตารางสอนที่ยังไม่ได้บันทึก',
        message: 'หากเปลี่ยนปี/ภาคเรียน รายการที่แก้ไขไว้จะถูกยกเลิก ต้องการดำเนินการต่อหรือไม่?',
        confirmText: 'ดำเนินการต่อ',
        cancelText: 'ยกเลิก',
        variant: 'warning',
      });
      if (!confirmed) return;
    }

    this.selectedYearSem.set(val);
    const [year, sem] = val.split('_');
    this.activeYear.set(year);
    this.activeSemester.set(sem);
    this.loadRooms();
  }

  swapRooms(): void {
    const leftRoom = this.selectedRoomLeft();
    const rightRoom = this.selectedRoomRight();
    const leftDay = this.selectedDayLeft();
    const rightDay = this.selectedDayRight();

    this.selectedRoomLeft.set(rightRoom);
    this.selectedRoomRight.set(leftRoom);
    this.selectedDayLeft.set(rightDay);
    this.selectedDayRight.set(leftDay);
  }

  // DRAG & DROP HANDLERS
  onDragStart(event: DragEvent, item: ScheduleClassItem, fromRoom: string, fromTime: number, fromDay: number): void {
    this.draggedItem.set({
      item,
      fromRoom,
      fromTime,
      fromDay,
    });

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', JSON.stringify({ courseNo: item.COURSE_NO, fromRoom, fromTime, fromDay }));
    }
  }

  onDragEnd(): void {
    this.draggedItem.set(null);
    this.hoveredDropTarget.set(null);
  }

  onDragOver(event: DragEvent, targetRoom: string, targetTime: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    const current = this.hoveredDropTarget();
    if (!current || current.targetRoom !== targetRoom || current.targetTime !== targetTime) {
      this.hoveredDropTarget.set({ targetRoom, targetTime });
    }
  }

  onDragLeave(event: DragEvent, targetRoom: string, targetTime: number): void {
    const current = this.hoveredDropTarget();
    if (current && current.targetRoom === targetRoom && current.targetTime === targetTime) {
      this.hoveredDropTarget.set(null);
    }
  }

  async onDrop(event: DragEvent, targetRoom: string, targetTime: number, targetDay: number): Promise<void> {
    event.preventDefault();
    const dragData = this.draggedItem();
    this.hoveredDropTarget.set(null);
    this.draggedItem.set(null);

    if (!dragData) return;

    const { item: sourceItem, fromRoom, fromTime, fromDay } = dragData;
    const cleanFromRoom = fromRoom.trim().toUpperCase();
    const cleanTargetRoom = targetRoom.trim().toUpperCase();

    // Dropped on the exact same room, time, and day -> No action
    if (cleanFromRoom === cleanTargetRoom && fromTime === targetTime && fromDay === targetDay) {
      return;
    }

    const currentList = [...this.allClassesForDay()];

    // Check if target slot is occupied in target room on target day at target time
    const targetOccupiedIndex = currentList.findIndex(
      (c) =>
        (c.ROOM_CODE || '').trim().toUpperCase() === cleanTargetRoom &&
        Number(c.TIME_CODE) === targetTime &&
        Number(c.DAY_CODE) === targetDay
    );

    const sourceIndex = currentList.findIndex(
      (c) =>
        c.COURSE_NO === sourceItem.COURSE_NO &&
        (c.ROOM_CODE || '').trim().toUpperCase() === cleanFromRoom &&
        Number(c.TIME_CODE) === fromTime &&
        Number(c.DAY_CODE) === fromDay
    );

    if (sourceIndex === -1) return;

    // Check Instructor Overlap Conflict on Target Slot
    const sourceInstructors = (sourceItem.INSTRUCTORS || []).map((i: any) => (i.INSTRUCTOR_CODE || '').trim()).filter(Boolean);
    if (sourceInstructors.length > 0) {
      const conflictClass = currentList.find(
        (c) =>
          Number(c.DAY_CODE) === targetDay &&
          Number(c.TIME_CODE) === targetTime &&
          c.COURSE_NO !== sourceItem.COURSE_NO &&
          !(sourceItem.PAIRED_COURSES || []).some((p: any) => p.courseNo === c.COURSE_NO) &&
          (c.INSTRUCTORS || []).some((ci: any) => sourceInstructors.includes((ci.INSTRUCTOR_CODE || '').trim()))
      );

      if (conflictClass) {
        const conflictingInst = (conflictClass.INSTRUCTORS || []).find((ci: any) => sourceInstructors.includes((ci.INSTRUCTOR_CODE || '').trim()));
        const instName = conflictingInst ? `${conflictingInst.RANK_NAME_THAI_S || ''}${conflictingInst.INSTRUCTOR_NAME_THAI || conflictingInst.INSTRUCTOR_CODE}` : 'อาจารย์ผู้สอน';
        const override = await this.confirmDialogService.confirm({
          title: '⚠️ ตรวจพบอาจารย์มีสอนซ้อน',
          message: `${instName} มีการสอนวิชา ${conflictClass.COURSE_NO} (${this.getRoomLabel(conflictClass.ROOM_CODE)}) ในวันและคาบนี้อยู่แล้ว ต้องการจัดตารางต่อไปหรือไม่?`,
          confirmText: 'ยืนยันจัดตาราง',
          cancelText: 'ยกเลิก',
          variant: 'warning',
          icon: 'warning',
        });
        if (!override) return;
      }
    }

    if (targetOccupiedIndex !== -1) {
      // SWAP CASE: Target slot is occupied!
      const targetItem = currentList[targetOccupiedIndex];

      const sourceDesc = `${this.getRoomLabel(cleanFromRoom)} ${this.getDayLabel(fromDay)} คาบที่ ${fromTime}`;
      const targetDesc = `${this.getRoomLabel(cleanTargetRoom)} ${this.getDayLabel(targetDay)} คาบที่ ${targetTime}`;

      const confirmed = await this.confirmDialogService.confirm({
        title: 'สลับคาบเรียนระหว่างห้อง / วัน',
        message: `ต้องการสลับวิชา ${sourceItem.COURSE_NO} (${sourceDesc}) กับวิชา ${targetItem.COURSE_NO} (${targetDesc}) หรือไม่?`,
        confirmText: 'สลับวิชา (Swap)',
        cancelText: 'ยกเลิก',
        variant: 'info',
      });

      if (!confirmed) return;

      // Identify any paired courses of source item in the same slot
      const sourcePairNos = (sourceItem.PAIRED_COURSES || []).map((p: any) => (p.courseNo || '').trim().toUpperCase());
      const pairedSourceItems = currentList.filter(
        (c) =>
          sourcePairNos.includes((c.COURSE_NO || '').trim().toUpperCase()) &&
          (c.ROOM_CODE || '').trim().toUpperCase() === cleanFromRoom &&
          Number(c.TIME_CODE) === fromTime &&
          Number(c.DAY_CODE) === fromDay
      );

      // Identify any paired courses of target item in the target slot (if swapping)
      const targetPairNos = (targetItem?.PAIRED_COURSES || []).map((p: any) => (p.courseNo || '').trim().toUpperCase());
      const pairedTargetItems = currentList.filter(
        (c) =>
          targetPairNos.includes((c.COURSE_NO || '').trim().toUpperCase()) &&
          (c.ROOM_CODE || '').trim().toUpperCase() === cleanTargetRoom &&
          Number(c.TIME_CODE) === targetTime &&
          Number(c.DAY_CODE) === targetDay
      );

      const updatedList = [...currentList];

      // Update source item to target position
      updatedList[sourceIndex] = {
        ...sourceItem,
        ROOM_CODE: targetRoom,
        TIME_CODE: targetTime,
        DAY_CODE: targetDay,
        isMoved: true,
      };
      this.recordMove(sourceItem.COURSE_NO, fromDay, targetDay, fromTime, targetTime, fromRoom, targetRoom, sourceItem.INSTR_GROUP);

      // Move source's paired courses together
      pairedSourceItems.forEach((pItem) => {
        const pIdx = updatedList.findIndex(
          (c) =>
            c.COURSE_NO === pItem.COURSE_NO &&
            (c.ROOM_CODE || '').trim().toUpperCase() === cleanFromRoom &&
            Number(c.TIME_CODE) === fromTime &&
            Number(c.DAY_CODE) === fromDay
        );
        if (pIdx !== -1) {
          updatedList[pIdx] = {
            ...pItem,
            ROOM_CODE: targetRoom,
            TIME_CODE: targetTime,
            DAY_CODE: targetDay,
            isMoved: true,
          };
          this.recordMove(pItem.COURSE_NO, fromDay, targetDay, fromTime, targetTime, fromRoom, targetRoom, pItem.INSTR_GROUP);
        }
      });

      // Update target item to source position
      updatedList[targetOccupiedIndex] = {
        ...targetItem,
        ROOM_CODE: fromRoom,
        TIME_CODE: fromTime,
        DAY_CODE: fromDay,
        isMoved: true,
      };
      this.recordMove(targetItem.COURSE_NO, targetDay, fromDay, targetTime, fromTime, targetRoom, fromRoom, targetItem.INSTR_GROUP);

      // Move target's paired courses together to source position
      pairedTargetItems.forEach((pItem) => {
        const pIdx = updatedList.findIndex(
          (c) =>
            c.COURSE_NO === pItem.COURSE_NO &&
            (c.ROOM_CODE || '').trim().toUpperCase() === cleanTargetRoom &&
            Number(c.TIME_CODE) === targetTime &&
            Number(c.DAY_CODE) === targetDay
        );
        if (pIdx !== -1) {
          updatedList[pIdx] = {
            ...pItem,
            ROOM_CODE: fromRoom,
            TIME_CODE: fromTime,
            DAY_CODE: fromDay,
            isMoved: true,
          };
          this.recordMove(pItem.COURSE_NO, targetDay, fromDay, targetTime, fromTime, targetRoom, fromRoom, pItem.INSTR_GROUP);
        }
      });

      this.allClassesForDay.set(updatedList);
    } else {
      // MOVE CASE: Target slot is empty!
      const updatedList = [...currentList];

      // Identify any paired courses of source item in the same slot
      const sourcePairNos = (sourceItem.PAIRED_COURSES || []).map((p: any) => (p.courseNo || '').trim().toUpperCase());
      const pairedSourceItems = currentList.filter(
        (c) =>
          sourcePairNos.includes((c.COURSE_NO || '').trim().toUpperCase()) &&
          (c.ROOM_CODE || '').trim().toUpperCase() === cleanFromRoom &&
          Number(c.TIME_CODE) === fromTime &&
          Number(c.DAY_CODE) === fromDay
      );

      updatedList[sourceIndex] = {
        ...sourceItem,
        ROOM_CODE: targetRoom,
        TIME_CODE: targetTime,
        DAY_CODE: targetDay,
        isMoved: true,
      };
      this.recordMove(sourceItem.COURSE_NO, fromDay, targetDay, fromTime, targetTime, fromRoom, targetRoom, sourceItem.INSTR_GROUP);

      // Move all paired courses along with source item
      pairedSourceItems.forEach((pItem) => {
        const pIdx = updatedList.findIndex(
          (c) =>
            c.COURSE_NO === pItem.COURSE_NO &&
            (c.ROOM_CODE || '').trim().toUpperCase() === cleanFromRoom &&
            Number(c.TIME_CODE) === fromTime &&
            Number(c.DAY_CODE) === fromDay
        );
        if (pIdx !== -1) {
          updatedList[pIdx] = {
            ...pItem,
            ROOM_CODE: targetRoom,
            TIME_CODE: targetTime,
            DAY_CODE: targetDay,
            isMoved: true,
          };
          this.recordMove(pItem.COURSE_NO, fromDay, targetDay, fromTime, targetTime, fromRoom, targetRoom, pItem.INSTR_GROUP);
        }
      });

      this.allClassesForDay.set(updatedList);
    }
  }

  private recordMove(
    courseNo: string,
    oldDay: number,
    newDay: number,
    oldTime: number,
    newTime: number,
    oldRoom: string,
    newRoom: string,
    instrGroup?: number
  ): void {
    const moves = [...this.pendingMoves()];

    // Find if this course was already moved in the current pending list
    const existingIndex = moves.findIndex((m) => m.courseNo === courseNo);

    if (existingIndex !== -1) {
      const prev = moves[existingIndex];
      // If it returned to its original position
      if (prev.oldDayCode === newDay && prev.oldTimeCode === newTime && prev.oldRoomCode === newRoom) {
        moves.splice(existingIndex, 1);
      } else {
        moves[existingIndex] = {
          ...prev,
          newDayCode: newDay,
          newTimeCode: newTime,
          newRoomCode: newRoom,
        };
      }
    } else {
      moves.push({
        courseNo,
        oldDayCode: oldDay,
        oldTimeCode: oldTime,
        newDayCode: newDay,
        newTimeCode: newTime,
        oldRoomCode: oldRoom,
        newRoomCode: newRoom,
        instrGroup,
      });
    }

    this.pendingMoves.set(moves);
  }

  getDayLabel(dayCode: number): string {
    const d = this.days.find((x) => x.code === dayCode);
    return d ? d.label : `วันรหัส ${dayCode}`;
  }

  getRoomLabel(code: string): string {
    const opt = this.roomOptions().find((r) => r.value === code);
    return opt ? opt.label : `ห้อง ${code}`;
  }

  toggleDraftListPopover(): void {
    this.isDraftListOpen.update((v) => !v);
  }

  resetChanges(): void {
    this.allClassesForDay.set(JSON.parse(JSON.stringify(this.originalClassesForDay())));
    this.pendingMoves.set([]);
    this.isDraftListOpen.set(false);
    this.toastService.info('ยกเลิกการเปลี่ยนแปลงทั้งหมดแล้ว');
  }

  async saveChanges(): Promise<void> {
    const moves = this.pendingMoves();
    if (moves.length === 0) {
      this.toastService.info('ไม่มีรายการเปลี่ยนแปลงที่ต้องบันทึก');
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      title: 'ยืนยันบันทึกการจัดตารางสอน',
      message: `ต้องการบันทึกการจัดตารางสอนที่แก้ไขทั้งหมด ${moves.length} รายการลงฐานข้อมูลหรือไม่?`,
      confirmText: 'ยืนยันบันทึกข้อมูล',
      cancelText: 'ตรวจสอบก่อน',
      variant: 'primary',
      icon: 'save',
    });

    if (!confirmed) return;

    this.isSaving.set(true);
    const payload = {
      studyYear: this.activeYear(),
      studySemester: this.activeSemester(),
      moves: moves,
      userInsert: this.authService.currentUser()?.email?.split('@')[0] || 'ADMIN',
    };

    this.http.post<{ success: boolean; message: string; updatedCount?: number }>(
      `${this.getBaseUrl()}/update-slots`,
      payload
    ).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res && res.success) {
          this.toastService.success(`บันทึกการจัดตารางเรียบร้อยแล้ว (${res.updatedCount || moves.length} รายการ)`);
          this.isDraftListOpen.set(false);
          this.loadScheduleClasses();
        } else {
          this.toastService.error(res?.message || 'ไม่สามารถบันทึกตารางสอนได้');
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        const errMsg = err?.error?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึก';
        this.toastService.error(errMsg);
      },
    });
  }

  getPairedCoursesTooltip(pairedList?: any[]): string {
    if (!pairedList || pairedList.length === 0) return '';
    return pairedList
      .map((p) => `${p.courseNo} (${p.courseNameThai || ''})`.trim())
      .join(', ');
  }

  openClassDetail(item: ScheduleClassItem, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedClassDetail.set(item);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedClassDetail.set(null);
  }
}
