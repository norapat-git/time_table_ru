import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPageComponent {
  readonly authService = inject(AuthService);
  readonly toastService = inject(ToastService);

  // Form State
  email = signal<string>('dev07@ru.ac.th');
  password = signal<string>('dev@24aug2026');
  showPassword = signal<boolean>(false);
  rememberMe = signal<boolean>(true);

  // Loading & Alert
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  fillTestAccount(): void {
    this.email.set('dev07@ru.ac.th');
    this.password.set('dev@24aug2026');
    this.errorMessage.set('');
    this.toastService.info('กรอกข้อมูลบัญชีทดสอบเรียบร้อย', 'บัญชีทดสอบ');
  }

  onSubmit(): void {
    const emailVal = this.email().trim();
    const passwordVal = this.password().trim();

    if (!emailVal || !passwordVal) {
      this.errorMessage.set('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      this.toastService.warning('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.toastService.loading('กำลังยืนยันตัวตนผ่าน Microsoft 365...');

    this.authService.login(emailVal, passwordVal).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.toastService.dismissLoading();

        if (!res.success) {
          const msg = res.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่มีสิทธิ์ในระบบ';
          this.errorMessage.set(msg);
          this.toastService.error(msg, 'เข้าสู่ระบบไม่สำเร็จ');
        } else {
          this.toastService.success(`ยินดีต้อนรับ ${res.results?.USER_THAINAME || emailVal}`, 'เข้าสู่ระบบสำเร็จ');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toastService.dismissLoading();
        const msg = err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
        this.errorMessage.set(msg);
        this.toastService.error(msg, 'ข้อผิดพลาดเครือข่าย');
      },
    });
  }
}
