import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../services/course.service';
import { Course, CoursePrefix, COURSE_PREFIXES, COURSE_PREFIX_LABELS } from '../../models/course.model';

@Component({
  selector: 'app-tab-course-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tab-course-search.html',
  styleUrl: './tab-course-search.css',
})
export class TabCourseSearchComponent {
  private readonly courseService = inject(CourseService);

  readonly prefixes = COURSE_PREFIXES;
  readonly prefixLabels = COURSE_PREFIX_LABELS;

  readonly selectedPrefix = this.courseService.selectedPrefix;
  readonly searchQuery = this.courseService.searchQuery;
  readonly filteredCourses = this.courseService.filteredCourses;
  readonly selectedCourse = this.courseService.selectedCourse;

  get searchQueryValue(): string {
    return this.searchQuery();
  }

  set searchQueryValue(val: string) {
    this.courseService.setSearchQuery(val);
  }

  selectPrefix(prefix: CoursePrefix): void {
    const current = this.selectedPrefix();
    this.courseService.setPrefix(current === prefix ? null : prefix);
  }

  selectCourse(course: Course): void {
    const current = this.selectedCourse();
    this.courseService.selectCourse(current?.id === course.id ? null : course);
  }

  clearAll(): void {
    this.courseService.setPrefix(null);
    this.courseService.setSearchQuery('');
    this.courseService.selectCourse(null);
  }

  getPrefixColor(prefix: CoursePrefix): string {
    const map: Record<CoursePrefix, string> = {
      A: '#2451a8',
      B: '#c0392b',
      S: '#d35400',
      F: '#8e44ad',
      G: '#27ae60',
    };
    return map[prefix];
  }
}
