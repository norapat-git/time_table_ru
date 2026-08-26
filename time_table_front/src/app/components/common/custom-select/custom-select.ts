import {
  Component,
  input,
  output,
  signal,
  ElementRef,
  HostListener,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectOption {
  value: any;
  label: string;
  subLabel?: string;
  icon?: string;
  badge?: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-select.html',
  styleUrl: './custom-select.css',
})
export class CustomSelectComponent {
  private readonly elementRef = inject(ElementRef);

  readonly options = input.required<SelectOption[]>();
  readonly value = input<any>(null);
  readonly placeholder = input<string>('กรุณาเลือก...');
  readonly icon = input<string>('');
  readonly disabled = input<boolean>(false);

  readonly valueChange = output<any>();

  readonly isOpen = signal<boolean>(false);

  readonly selectedOption = computed(() => {
    const val = this.value();
    return this.options().find((opt) => opt.value === val) || null;
  });

  toggleOpen(): void {
    if (this.disabled()) return;
    this.isOpen.set(!this.isOpen());
  }

  selectOption(opt: SelectOption, event: MouseEvent): void {
    event.stopPropagation();
    this.valueChange.emit(opt.value);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }
}
