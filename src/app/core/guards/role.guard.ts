import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard =
  (allowed: string[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const rol = auth.currentUser()?.rol ?? 'usuario';

    if (allowed.includes(rol)) {
      return true;
    }

    return router.parseUrl('/home');
  };
