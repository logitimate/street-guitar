import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ALL_LESSONS, CURRICULUM, Lesson, Module } from '../curriculum-data';
import { AuthService } from '../../services/auth.service';
import { LessonService } from '../../services/lesson.service';

@Component({
  selector: 'app-lesson-player',
  templateUrl: './lesson-player.html',
  styleUrl: './lesson-player.css',
  imports: [RouterLink],
})
export class LessonPlayer {
  private route     = inject(ActivatedRoute);
  private router    = inject(Router);
  private sanitizer = inject(DomSanitizer);
  auth          = inject(AuthService);
  lessonService = inject(LessonService);

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }

  curriculum = CURRICULUM;
  openModules = signal<Set<number>>(new Set([1, 2]));

  currentLessonId = toSignal(
    this.route.params.pipe(map(p => +p['id'])),
    { initialValue: 1 },
  );

  currentLesson = computed<Lesson>(() =>
    ALL_LESSONS.find(l => l.id === this.currentLessonId()) ?? ALL_LESSONS[0]
  );

  currentModule = computed<Module>(() =>
    CURRICULUM.find(m => m.lessons.some(l => l.id === this.currentLessonId())) ?? CURRICULUM[0]
  );

  currentLessonIndex = computed(() =>
    this.currentModule().lessons.findIndex(l => l.id === this.currentLessonId())
  );

  prevLesson = computed<Lesson | null>(() => {
    const idx = ALL_LESSONS.findIndex(l => l.id === this.currentLessonId());
    return idx > 0 ? ALL_LESSONS[idx - 1] : null;
  });

  nextLesson = computed<Lesson | null>(() => {
    const idx = ALL_LESSONS.findIndex(l => l.id === this.currentLessonId());
    return idx < ALL_LESSONS.length - 1 ? ALL_LESSONS[idx + 1] : null;
  });

  youtubeUrl = computed<SafeResourceUrl | null>(() => {
    const id = this.lessonService.getVideoId(this.currentLessonId());
    if (!id) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&controls=1&iv_load_policy=3`,
    );
  });

  isLessonCompleted(lessonId: number): boolean {
    return !!this.auth.progress()[String(lessonId)];
  }

  isCurrentLessonComplete = computed(() =>
    this.isLessonCompleted(this.currentLessonId())
  );

  async markComplete() {
    if (this.isCurrentLessonComplete()) return;
    await this.auth.markLessonComplete(this.currentLessonId());
  }

  goTo(lessonId: number) {
    this.router.navigate(['/learn/lesson', lessonId]);
    this.openModules.update(set => {
      const mod = CURRICULUM.find(m => m.lessons.some(l => l.id === lessonId));
      if (mod) { const next = new Set(set); next.add(mod.id); return next; }
      return set;
    });
  }

  toggleModule(modId: number) {
    this.openModules.update(set => {
      const next = new Set(set);
      if (next.has(modId)) { next.delete(modId); } else { next.add(modId); }
      return next;
    });
  }

  isModuleOpen(modId: number) { return this.openModules().has(modId); }
}
