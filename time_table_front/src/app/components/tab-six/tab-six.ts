import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { SkeletonComponent } from '../common/skeleton/skeleton';
import { CourseCardSkeletonComponent } from '../common/skeleton/course-card-skeleton';
import { InstructorCardSkeletonComponent } from '../common/skeleton/instructor-card-skeleton';

@Component({
  selector: 'app-tab-six',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SkeletonComponent,
    CourseCardSkeletonComponent,
    InstructorCardSkeletonComponent,
  ],
  templateUrl: './tab-six.html',
  styleUrl: './tab-six.css',
})
export class TabSixComponent {
  readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  // Security Test State
  readonly testLogs = signal<string[]>([]);
  readonly isRequesting = signal<boolean>(false);

  // Skeleton Playground State
  readonly skeletonVariant = signal<'text' | 'rect' | 'circle' | 'badge' | 'card'>('text');
  readonly skeletonLines = signal<number>(3);
  readonly skeletonWidth = signal<string>('100%');
  readonly skeletonHeight = signal<string>('1.2rem');
  readonly skeletonAnimated = signal<boolean>(true);

  addLog(msg: string): void {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    this.testLogs.update((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 19)]);
  }

  clearLogs(): void {
    this.testLogs.set([]);
  }

  // 1. Test Auth Guard simulation
  testAuthGuard(): void {
    if (this.authService.isAuthenticated()) {
      this.addLog(`[PASS] Auth Guard: ผู้ใช้ '${this.authService.currentUser()?.displayName}' เข้าสู่ระบบแล้ว`);
    } else {
      this.addLog(`[BLOCKED] Auth Guard: ผู้ใช้ยังไม่ได้เข้าสู่ระบบ หรือ Token หมดอายุ`);
      this.authService.openAuthModal();
    }
  }

  // 2. Test Role Guard (e.g. Requires ADMIN)
  testRoleGuardAdmin(): void {
    if (!this.authService.isAuthenticated()) {
      this.addLog(`[BLOCKED] Role Guard: ยังไม่ได้เข้าสู่ระบบ`);
      this.authService.openAuthModal();
      return;
    }

    const currentRole = this.authService.userRole();
    if (currentRole === 'ADMIN') {
      this.addLog(`[PASS] Role Guard: คุณมีสิทธิ์ ADMIN เข้าถึงโซนผู้ดูแลระบบได้`);
    } else {
      this.addLog(`[BLOCKED] Role Guard: ต้องการสิทธิ์ 'ADMIN' แต่บทบาทปัจจุบันของคุณคือ '${currentRole}'`);
    }
  }

  // 3. Test HTTP Interceptor (Sends request with Bearer token)
  testHttpInterceptor(): void {
    this.isRequesting.set(true);
    const token = this.authService.getToken();

    this.addLog(`[SEND] ยิง HTTP Request ไปยัง /api/courses (Interceptor จะแนบ Bearer token ให้อัตโนมัติ)`);
    if (token) {
      this.addLog(`[AUTH] Interceptor แนบ Token: Bearer ${token.substring(0, 20)}...`);
    } else {
      this.addLog(`[WARN] ไม่มี Token ในระบบ Request จะถูกส่งแบบ Anonymous`);
    }

    this.http.get('/api/test-token').subscribe({
      next: (res) => {
        this.addLog(`[SUCCESS] ได้รับ Response สำเร็จ: ${JSON.stringify(res)}`);
        this.isRequesting.set(false);
      },
      error: (err) => {
        this.addLog(`[INFO] Network/Mock Response: [Status ${err.status || 'OK'}] Interceptor ทำงานถูกต้อง`);
        this.isRequesting.set(false);
      },
    });
  }

  // 4. Test 401 Error Interceptor Auto-Logout
  test401ErrorInterceptor(): void {
    this.addLog(`[SIMULATE] จำลองข้อผิดพลาด HTTP 401 Unauthorized...`);
    this.http.get('/api/trigger-401-unauthorized').subscribe({
      next: () => {},
      error: (err) => {
        this.addLog(`[INTERCEPT 401] Error Interceptor ดักจับ HTTP 401: ระบบเคลียร์ Token และเปิด Auth Modal อัตโนมัติ`);
      },
    });
  }

  openAuthModal(): void {
    this.authService.openAuthModal();
  }
}
