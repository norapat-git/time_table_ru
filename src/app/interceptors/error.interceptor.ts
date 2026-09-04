import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Functional HTTP Interceptor for handling global HTTP errors (401, 403, 500, etc.)
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 401:
            // Token expired or invalid
            console.error('[HTTP 401] Unauthorized access - Expired or Invalid Token:', error.url);
            authService.logout();
            authService.openAuthModal();
            break;

          case 403:
            // Forbidden access - insufficient roles
            console.error('[HTTP 403] Forbidden - Insufficient Permissions:', error.url);
            break;

          case 500:
          case 502:
          case 503:
            console.error(`[HTTP ${error.status}] Server error:`, error.message);
            break;

          default:
            console.error(`[HTTP ${error.status}] Request failed:`, error.message);
            break;
        }
      }

      return throwError(() => error);
    })
  );
};
