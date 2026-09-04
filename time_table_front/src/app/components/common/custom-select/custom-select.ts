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
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, FormsModule],
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
  readonly searchable = input<boolean>(false);
  readonly allowCustom = input<boolean>(false);
  readonly searchPlaceholder = input<string>('พิมพ์เพื่อค้นหา...');

  readonly valueChange = output<any>();

  readonly isOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  readonly selectedOption = computed(() => {
    const val = this.value();
    const found = this.options().find((opt) => opt.value === val);
    if (found) return found;
    if (val && this.allowCustom()) {
      return { value: val, label: String(val) };
    }
    return null;
  });

  readonly filteredOptions = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const opts = this.options();
    if (!q) return opts;
    return opts.filter((opt) =>
      opt.label.toLowerCase().includes(q) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
      String(opt.value).toLowerCase().includes(q)
    );
  });

  readonly isExactMatchFound = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return true;
    return this.options().some((opt) =>
      String(opt.value).trim().toLowerCase() === q ||
      opt.label.trim().toLowerCase() === q
    );
  });

  toggleOpen(): void {
    if (this.disabled()) return;
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);
    if (nextState) {
      this.searchQuery.set('');
    }
  }

  selectOption(opt: SelectOption, event: MouseEvent): void {
    event.stopPropagation();
    this.valueChange.emit(opt.value);
    this.isOpen.set(false);
    this.searchQuery.set('');
  }

  selectCustom(event: MouseEvent): void {
    event.stopPropagation();
    const val = this.searchQuery().trim();
    if (val) {
      this.valueChange.emit(val);
      this.isOpen.set(false);
      this.searchQuery.set('');
    }
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
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
