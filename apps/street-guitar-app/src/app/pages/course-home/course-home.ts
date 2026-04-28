import { Component, inject } from '@angular/core';
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

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  modules: ModuleViewModel[] = CURRICULUM.map(mod => {
    const completedCount = mod.lessons.filter(l => l.completed).length;
    const progress = Math.round((completedCount / mod.lessons.length) * 100);
    const currentLesson = mod.lessons.find(l => !l.completed) ?? mod.lessons[0];
    return {
      ...mod,
      progress,
      completedCount,
      currentLessonId: currentLesson.id,
      totalDuration: this.sumDuration(mod.lessons.map(l => l.duration)),
    };
  });

  totalLessonsComplete = this.modules.reduce((n, m) => n + m.completedCount, 0);
  totalLessons = this.modules.reduce((n, m) => n + m.lessons.length, 0);
  overallProgress = Math.round((this.totalLessonsComplete / this.totalLessons) * 100);

  currentModule = this.modules.find(m => m.progress > 0 && m.progress < 100) ?? this.modules[0];

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
    if (mod.locked) return 'locked';
    if (mod.progress === 100) return 'complete';
    if (mod.progress > 0) return 'in-progress';
    return 'available';
  }
}
