import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * URLs that should bypass adding the Authorization header
 */
const BYPASS_URLS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/service/login',
  '/assets/',
];

/**
 * Functional HTTP Interceptor for appending Bearer Token to outgoing requests
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Check if current URL matches bypass list
  const shouldBypass = BYPASS_URLS.some((url) => req.url.includes(url));

  if (token && !shouldBypass) {
    // Clone the request and add Authorization header
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  return next(req);
};
