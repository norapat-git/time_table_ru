import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TabLockService {
  readonly isLocked = signal<boolean>(false);
  readonly lockReason = signal<string>('');

  lock(reason: string = 'กำลังอยู่ในโหมดจัดตาราง (Drag & Drop) กรุณาบันทึกหรือยกเลิกก่อนเปลี่ยนแท็บ'): void {
    this.isLocked.set(true);
    this.lockReason.set(reason);
  }

  unlock(): void {
    this.isLocked.set(false);
    this.lockReason.set('');
  }
}
