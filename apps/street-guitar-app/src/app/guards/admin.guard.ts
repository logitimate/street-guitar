import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (auth.isAdmin())    return true;
  if (auth.isLoggedIn()) return router.createUrlTree(['/learn']);
  return router.createUrlTree(['/login']);
};
