import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  return auth.isLoggedIn() ? router.createUrlTree(['/learn']) : true;
};

export const subscriptionGuard: CanActivateFn = async (route) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: route.url.map(s => s.path).join('/') },
    });
  }

  if (auth.isAdmin() || auth.isSubscribed()) return true;

  return router.createUrlTree(['/'], { fragment: 'pricing' });
};
