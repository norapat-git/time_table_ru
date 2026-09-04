import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { getJwtHeader, getJwtPayload } from '../../../utils/jwt.util';

@Component({
  selector: 'app-jwt-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jwt-modal.html',
  styleUrl: './jwt-modal.css',
})
export class JwtModalComponent implements OnInit {
  readonly authService = inject(AuthService);

  rawTokenInput: string = '';
  decodedHeaderJson: string = '{\n  "alg": "HS256",\n  "typ": "JWT"\n}';
  decodedPayloadJson: string = '{\n  "message": "กรุณากรอกหรือเลือก Token"\n}';

  ngOnInit(): void {
    this.loadCurrentToken();
  }

  loadCurrentToken(): void {
    const current = this.authService.getToken();
    if (current) {
      this.rawTokenInput = current;
      this.updateDecodedPanels(current);
    }
  }

  onTokenChange(): void {
    this.updateDecodedPanels(this.rawTokenInput);
  }

  private updateDecodedPanels(token: string): void {
    if (!token.trim()) {
      this.decodedHeaderJson = '{\n  "info": "ไม่มีข้อมูล Token"\n}';
      this.decodedPayloadJson = '{\n  "info": "ไม่มีข้อมูล Token"\n}';
      return;
    }

    try {
      const header = getJwtHeader(token);
      const payload = getJwtPayload(token);

      this.decodedHeaderJson = header
        ? JSON.stringify(header, null, 2)
        : '{\n  "error": "Header รูปแบบไม่ถูกต้อง"\n}';

      this.decodedPayloadJson = payload
        ? JSON.stringify(payload, null, 2)
        : '{\n  "error": "Payload รูปแบบไม่ถูกต้อง"\n}';
    } catch (e: any) {
      this.decodedHeaderJson = '{\n  "error": "ไม่สามารถแปลง Token ได้"\n}';
      this.decodedPayloadJson = `{\n  "error": "${e.message || 'Decode Error'}"\n}`;
    }
  }

  applyPreset(preset: 'ADMIN' | 'INSTRUCTOR' | 'STAFF' | 'STUDENT' | 'EXPIRED'): void {
    this.authService.loginWithPreset(preset);
    this.loadCurrentToken();
  }

  applyCustomToken(): void {
    if (!this.rawTokenInput.trim()) {
      alert('กรุณากรอก Token ก่อน');
      return;
    }

    const success = this.authService.loginWithToken(this.rawTokenInput.trim());
    if (success) {
      alert('เข้าสู่ระบบด้วย Token เรียบร้อยแล้ว!');
    } else {
      alert('Token ไม่ถูกต้อง หรือหมดอายุแล้ว');
    }
  }

  logout(): void {
    this.authService.logout();
    this.rawTokenInput = '';
    this.decodedHeaderJson = '{\n  "status": "Logged out"\n}';
    this.decodedPayloadJson = '{\n  "status": "Logged out"\n}';
  }

  copyJson(text: string): void {
    navigator.clipboard?.writeText(text);
    alert('คัดลอก JSON ไปยังคลิปบอร์ดแล้ว');
  }

  close(): void {
    this.authService.closeAuthModal();
  }

  closeOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }
}
