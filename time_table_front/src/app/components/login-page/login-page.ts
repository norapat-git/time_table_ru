import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPageComponent {
  readonly authService = inject(AuthService);

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
  }

  onSubmit(): void {
    const emailVal = this.email().trim();
    const passwordVal = this.password().trim();

    if (!emailVal || !passwordVal) {
      this.errorMessage.set('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(emailVal, passwordVal).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (!res.success) {
          this.errorMessage.set(res.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่มีสิทธิ์ในระบบ');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      },
    });
  }
}
