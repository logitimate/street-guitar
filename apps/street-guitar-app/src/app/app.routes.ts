import { Route } from '@angular/router';
import { Home } from './pages/home/home';
import { CourseHome } from './pages/course-home/course-home';
import { LessonPlayer } from './pages/lesson-player/lesson-player';
import { Login } from './pages/login/login';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { AdminDashboard } from './pages/admin/admin-dashboard';
import { authGuard, guestGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const appRoutes: Route[] = [
  { path: '',                  component: Home           },
  { path: 'login',             component: Login,          canActivate: [guestGuard] },
  { path: 'forgot-password',   component: ForgotPassword, canActivate: [guestGuard] },
  { path: 'learn',             component: CourseHome,     canActivate: [authGuard]  },
  { path: 'learn/lesson/:id',  component: LessonPlayer,   canActivate: [authGuard]  },
  { path: 'admin',             component: AdminDashboard, canActivate: [adminGuard] },
  { path: '**',                redirectTo: ''             },
];
