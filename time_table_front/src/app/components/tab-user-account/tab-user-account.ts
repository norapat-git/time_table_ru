import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonComponent } from '../common/skeleton/skeleton';

export interface UserAccountItem {
  email: string;
  thaiName: string;
  engName: string;
  stateInTime?: string;
  stateOutTime?: string;
  flag: string; // '1' = ใช้งานได้, '0' = ปิดการใช้งาน
}

@Component({
  selector: 'app-tab-user-account',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  templateUrl: './tab-user-account.html',
  styleUrl: './tab-user-account.css',
})
export class TabUserAccountComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // Main User Accounts List
  readonly accounts = signal<UserAccountItem[]>([
    {
      email: 'dev07@ru.ac.th',
      thaiName: 'นายทดสอบ พัฒนาระบบ',
      engName: 'TODSOB PATTANARABOB',
      stateInTime: '2026-08-24 15:30:00',
      flag: '1',
    },
    {
      email: 'somchai.j@ru.ac.th',
      thaiName: 'อาจารย์สมชาย ใจดี',
      engName: 'SOMCHAI JAIDEE',
      stateInTime: '2026-08-24 09:15:22',
      flag: '1',
    },
    {
      email: 'pimjai.r@ru.ac.th',
      thaiName: 'อาจารย์พิมพ์ใจ รักเรียน',
      engName: 'PIMJAI RAKRIAN',
      stateInTime: '2026-08-23 14:20:05',
      flag: '1',
    },
    {
      email: 'admin.super@ru.ac.th',
      thaiName: 'ผู้ดูแลระบบ ส่วนกลาง',
      engName: 'ADMINISTRATOR',
      stateInTime: '2026-08-24 15:00:10',
      flag: '1',
    },
  ]);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly editingEmail = signal<string | null>(null);

  // Form Fields
  modalEmail: string = '';
  modalThaiName: string = '';
  modalEngName: string = '';
  modalFlag: string = '1';

  // Filtered Accounts
  readonly filteredAccounts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.accounts();
    if (!q) return list;

    return list.filter((a) => {
      const email = a.email.toLowerCase();
      const th = a.thaiName.toLowerCase();
      const en = a.engName.toLowerCase();
      return email.includes(q) || th.includes(q) || en.includes(q);
    });
  });

  ngOnInit(): void {
    this.loadAccountsFromBackend();
  }

  loadAccountsFromBackend(): void {
    this.isLoading.set(true);
    const baseUrl = window.location.port === '4200' ? 'http://localhost:4000/api/service/account' : '/api/service/account';
    this.http.get<{ success: boolean; results: any[] }>(`${baseUrl}/list`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.success && Array.isArray(res.results) && res.results.length > 0) {
          const mapped: UserAccountItem[] = res.results.map((r) => ({
            email: r.USER_EMAIL,
            thaiName: r.USER_THAINAME || '',
            engName: r.USER_ENGNAME || '',
            stateInTime: r.USER_STATEIN_TIME || '',
            stateOutTime: r.USER_STATEOUT_TIME || '',
            flag: r.FLAG || '1',
          }));
          this.accounts.set(mapped);
        }
      },
      error: () => {
        // Fallback to local signal data if offline
        this.isLoading.set(false);
      },
    });
  }

  // Open Modal for Insert
  openAddModal(): void {
    this.isEditing.set(false);
    this.editingEmail.set(null);
    this.modalEmail = '';
    this.modalThaiName = '';
    this.modalEngName = '';
    this.modalFlag = '1';
    this.isModalOpen.set(true);
  }

  // Open Modal for Edit
  openEditModal(item: UserAccountItem): void {
    this.isEditing.set(true);
    this.editingEmail.set(item.email);
    this.modalEmail = item.email;
    this.modalThaiName = item.thaiName;
    this.modalEngName = item.engName;
    this.modalFlag = item.flag;
    this.isModalOpen.set(true);
  }

  // Save (Create or Update)
  saveAccount(): void {
    if (!this.modalEmail.trim()) {
      alert('กรุณากรอกอีเมลผู้ใช้งาน');
      return;
    }

    const payload = {
      email: this.modalEmail.trim().toLowerCase(),
      thaiName: this.modalThaiName.trim(),
      engName: this.modalEngName.trim(),
      flag: this.modalFlag,
    };

    const baseUrl = window.location.port === '4200' ? 'http://localhost:4000/api/service/account' : '/api/service/account';

    if (this.isEditing() && this.editingEmail()) {
      // Update
      this.http.put<{ success: boolean; message: string }>(`${baseUrl}/update`, payload).subscribe({
        next: () => {
          this.updateLocalState(payload);
          this.closeModal();
        },
        error: () => {
          this.updateLocalState(payload);
          this.closeModal();
        },
      });
    } else {
      // Insert
      this.http.post<{ success: boolean; message: string }>(`${baseUrl}/add`, payload).subscribe({
        next: (res) => {
          if (res && res.success === false) {
            alert(res.message);
            return;
          }
          this.insertLocalState(payload);
          this.closeModal();
        },
        error: () => {
          this.insertLocalState(payload);
          this.closeModal();
        },
      });
    }
  }

  private updateLocalState(payload: { email: string; thaiName: string; engName: string; flag: string }): void {
    this.accounts.update((list) =>
      list.map((item) => (item.email === payload.email ? { ...item, ...payload } : item))
    );
  }

  private insertLocalState(payload: { email: string; thaiName: string; engName: string; flag: string }): void {
    const newItem: UserAccountItem = {
      ...payload,
      stateInTime: 'ยังไม่เคยเข้าสู่ระบบ',
    };
    this.accounts.update((list) => [newItem, ...list.filter((it) => it.email !== payload.email)]);
  }

  // Delete
  deleteAccount(email: string): void {
    if (confirm(`คุณต้องการลบสิทธิ์ผู้ใช้งาน "${email}" ใช่หรือไม่?`)) {
      const baseUrl = window.location.port === '4200' ? 'http://localhost:4000/api/service/account' : '/api/service/account';
      this.http.delete(`${baseUrl}/delete/${encodeURIComponent(email)}`).subscribe({
        next: () => {
          this.accounts.update((list) => list.filter((a) => a.email !== email));
        },
        error: () => {
          this.accounts.update((list) => list.filter((a) => a.email !== email));
        },
      });
    }
  }

  // Toggle Flag quick action
  toggleStatus(item: UserAccountItem): void {
    const nextFlag = item.flag === '1' ? '0' : '1';
    const payload = {
      email: item.email,
      thaiName: item.thaiName,
      engName: item.engName,
      flag: nextFlag,
    };

    const baseUrl = window.location.port === '4200' ? 'http://localhost:4000/api/service/account' : '/api/service/account';
    this.http.put(`${baseUrl}/update`, payload).subscribe({
      next: () => this.updateLocalState(payload),
      error: () => this.updateLocalState(payload),
    });
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }
}
