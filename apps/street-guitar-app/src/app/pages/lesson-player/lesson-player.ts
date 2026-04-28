import { Component, computed, inject, signal } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ALL_LESSONS, CURRICULUM, Lesson, Module } from '../curriculum-data';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-lesson-player',
  templateUrl: './lesson-player.html',
  styleUrl: './lesson-player.css',
  imports: [RouterLink, LowerCasePipe],
})
export class LessonPlayer {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  curriculum = CURRICULUM;
  isPlaying = signal(false);

  openModules = signal<Set<number>>(new Set([1, 2]));

  currentLessonId = toSignal(
    this.route.params.pipe(map(p => +p['id'])),
    { initialValue: 9 },
  );

  currentLesson = computed<Lesson>(() => {
    return ALL_LESSONS.find(l => l.id === this.currentLessonId()) ?? ALL_LESSONS[0];
  });

  currentModule = computed<Module>(() => {
    return CURRICULUM.find(m => m.lessons.some(l => l.id === this.currentLessonId())) ?? CURRICULUM[0];
  });

  currentLessonIndex = computed(() => {
    return this.currentModule().lessons.findIndex(l => l.id === this.currentLessonId());
  });

  prevLesson = computed<Lesson | null>(() => {
    const idx = ALL_LESSONS.findIndex(l => l.id === this.currentLessonId());
    return idx > 0 ? ALL_LESSONS[idx - 1] : null;
  });

  nextLesson = computed<Lesson | null>(() => {
    const idx = ALL_LESSONS.findIndex(l => l.id === this.currentLessonId());
    return idx < ALL_LESSONS.length - 1 ? ALL_LESSONS[idx + 1] : null;
  });

  goTo(lessonId: number) {
    this.isPlaying.set(false);
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
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  }

  isModuleOpen(modId: number) {
    return this.openModules().has(modId);
  }
}
