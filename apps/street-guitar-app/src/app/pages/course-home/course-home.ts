import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CURRICULUM, Module } from '../curriculum-data';
import { AuthService } from '../../services/auth.service';

interface ModuleViewModel extends Module {
  progress: number;
  completedCount: number;
  currentLessonId: number;
  totalDuration: string;
}

@Component({
  selector: 'app-course-home',
  templateUrl: './course-home.html',
  styleUrl: './course-home.css',
  imports: [RouterLink],
})
export class CourseHome {
  auth = inject(AuthService);
  private router = inject(Router);

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }

  readonly totalLessons = CURRICULUM.reduce((n, m) => n + m.lessons.length, 0);

  modules = computed<ModuleViewModel[]>(() => {
    const progress = this.auth.progress();
    return CURRICULUM.map(mod => {
      const completedCount = mod.lessons.filter(l => !!progress[String(l.id)]).length;
      const progressPct    = Math.round((completedCount / mod.lessons.length) * 100);
      const currentLesson  = mod.lessons.find(l => !progress[String(l.id)]) ?? mod.lessons[mod.lessons.length - 1];
      return {
        ...mod,
        progress: progressPct,
        completedCount,
        currentLessonId: currentLesson.id,
        totalDuration: this.sumDuration(mod.lessons.map(l => l.duration)),
      };
    });
  });

  totalLessonsComplete = computed(() => this.modules().reduce((n, m) => n + m.completedCount, 0));
  overallProgress      = computed(() => Math.round((this.totalLessonsComplete() / this.totalLessons) * 100));
  currentModule        = computed(() =>
    this.modules().find(m => m.progress > 0 && m.progress < 100) ?? this.modules()[0]
  );

  private sumDuration(durations: string[]): string {
    const totalSec = durations.reduce((acc, d) => {
      const [m, s] = d.split(':').map(Number);
      return acc + m * 60 + s;
    }, 0);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  getModuleStatus(mod: ModuleViewModel): string {
    if (mod.locked)           return 'locked';
    if (mod.progress === 100) return 'complete';
    if (mod.progress > 0)     return 'in-progress';
    return 'available';
  }

  referralLink = computed(() => {
    const code = this.auth.user()?.referralCode;
    if (!code) return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}#/?ref=${code}`;
  });

  referralCount = computed(() => this.auth.user()?.referralCount ?? 0);

  linkCopied = signal(false);

  async copyReferralLink() {
    const link = this.referralLink();
    if (!link) return;
    await navigator.clipboard.writeText(link);
    this.linkCopied.set(true);
    setTimeout(() => this.linkCopied.set(false), 2000);
  }
}
