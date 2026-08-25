import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional Route Guard for protecting routes requiring authentication
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store target URL to redirect back after login
  console.warn(`[AuthGuard] Access blocked to '${state.url}'. User is not authenticated.`);
  authService.openAuthModal();

  // If routes are configured, can navigate to login
  // router.navigate(['/login'], { queryParams: { returnUrl: state.url } });

  return false;
};
