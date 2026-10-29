import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LessonService } from '../../services/lesson.service';
import { CURRICULUM } from '../curriculum-data';
import { NavUserChip } from '../../components/nav-user-chip';

@Component({
  selector: 'app-admin-content',
  templateUrl: './admin-content.html',
  styleUrl: './admin-content.css',
  imports: [RouterLink, NavUserChip],
})
export class AdminContent {
  auth          = inject(AuthService);
  lessonService = inject(LessonService);

  curriculum = CURRICULUM;

  savingLesson = signal<number | null>(null);
  savedLesson  = signal<number | null>(null);

  async save(lessonId: number, raw: string) {
    this.savingLesson.set(lessonId);
    this.savedLesson.set(null);
    await this.lessonService.setVideoId(lessonId, raw);
    this.savingLesson.set(null);
    this.savedLesson.set(lessonId);
    setTimeout(() => {
      if (this.savedLesson() === lessonId) this.savedLesson.set(null);
    }, 2500);
  }
}
