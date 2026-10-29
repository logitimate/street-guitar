import { isDevMode } from '@angular/core';
import { Route } from '@angular/router';
import { Home } from './pages/home/home';
import { CourseHome } from './pages/course-home/course-home';
import { LessonPlayer } from './pages/lesson-player/lesson-player';
import { Login } from './pages/login/login';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { AdminDashboard } from './pages/admin/admin-dashboard';
import { AdminContent } from './pages/admin/admin-content';
import { guestGuard, subscriptionGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const appRoutes: Route[] = [
  { path: '',                  component: Home           },
  { path: 'login',             component: Login,          canActivate: [guestGuard] },
  { path: 'forgot-password',   component: ForgotPassword, canActivate: [guestGuard] },
  { path: 'learn',             component: CourseHome,     canActivate: [subscriptionGuard] },
  { path: 'learn/lesson/:id',  component: LessonPlayer,   canActivate: [subscriptionGuard] },
  { path: 'admin',             component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'admin/content',     component: AdminContent,   canActivate: [adminGuard] },
  // SPIKE: unguarded preview of the Ch 2 practice apps, dev builds only
  ...(isDevMode()
    ? [{ path: 'practice', loadComponent: () => import('./tutorials/practice-preview').then(m => m.PracticePreview) }]
    : []),
  { path: '**',                redirectTo: ''             },
];
