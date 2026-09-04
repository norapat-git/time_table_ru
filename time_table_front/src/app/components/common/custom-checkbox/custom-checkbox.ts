import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

let nextCheckboxId = 0;

@Component({
  selector: 'app-custom-checkbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-checkbox.html',
  styleUrl: './custom-checkbox.css',
})
export class CustomCheckboxComponent {
  readonly checked = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly id = input<string>(`cbx-12-${++nextCheckboxId}`);

  readonly checkedChange = output<boolean>();

  onInputChange(event: Event): void {
    if (this.disabled()) return;
    const isChecked = (event.target as HTMLInputElement).checked;
    this.checkedChange.emit(isChecked);
  }
}
