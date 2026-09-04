import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

/**
 * Functional Route Guard Factory for Role-Based Access Control (RBAC)
 * @param allowedRoles List of roles permitted to access this route
 */
export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);

    if (!authService.isAuthenticated()) {
      console.warn(`[RoleGuard] Access blocked to '${state.url}'. User not authenticated.`);
      authService.openAuthModal();
      return false;
    }

    const currentRole = authService.userRole();
    const hasPermission = allowedRoles.includes(currentRole);

    if (!hasPermission) {
      console.warn(`[RoleGuard] Access denied to '${state.url}'. Required: [${allowedRoles.join(', ')}], Current: '${currentRole}'.`);
      alert(`คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องการสิทธิ์: ${allowedRoles.join(', ')})`);
      return false;
    }

    return true;
  };
}
