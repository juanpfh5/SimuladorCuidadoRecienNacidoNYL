import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const curp = auth.getCurp();
  console.log('[authGuard] checking login, curp=', curp);
  if (auth.isLoggedIn()) {
    return true;
  }

  console.log('[authGuard] not logged in — redirecting to /login');
  return router.parseUrl('/login') as UrlTree;
};
