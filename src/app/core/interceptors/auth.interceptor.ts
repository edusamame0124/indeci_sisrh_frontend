import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { ClientTelemetryService } from '../services/client-telemetry.service';
import { RefreshQueueService } from '../services/refresh-queue.service';
import { TokenStorageService } from '../services/token-storage.service';

interface RefreshResponseBody {
  token: string;
  refreshToken: string;
  roles?: string[];
  permisos?: string[];
}

/**
 * Interceptor de autenticación:
 *  (a) Inyecta `Authorization: Bearer <accessToken>` en peticiones que apuntan al backend.
 *  (b) Maneja 401 disparando refresh transparente con cola (FR-023, FR-024).
 *  (c) Si el refresh falla, ejecuta logout y redirige a /auth/login con returnUrl (FR-025, FR-026).
 *
 * Excluye explícitamente endpoints públicos: /api/auth/login y /api/auth/refresh.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const storage = inject(TokenStorageService);
  const queue = inject(RefreshQueueService);
  const router = inject(Router);
  const telemetry = inject(ClientTelemetryService);
  const http = inject(HttpClient);

  const isPublicEndpoint =
    req.url.includes('/api/auth/login') || req.url.includes('/api/auth/refresh');

  // (a) Inyectar Bearer si aplica
  let authedReq = req;
  if (!isPublicEndpoint) {
    const token = storage.getAccess();
    if (token) {
      authedReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo manejar 401 en endpoints NO públicos
      if (error.status !== 401 || isPublicEndpoint) {
        return throwError(() => error);
      }

      // (b) 401 → refresh transparente
      if (queue.isRefreshing) {
        // Otro 401 mientras refresh en curso: encolar
        return queue.waitForNewToken$().pipe(
          switchMap((newToken) => next(retryWithToken(authedReq, newToken))),
        );
      }

      // Primer 401: disparar refresh
      return triggerRefresh(authedReq, auth, storage, queue, router, telemetry, http, next);
    }),
  );
};

function retryWithToken(originalReq: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return originalReq.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function triggerRefresh(
  originalReq: HttpRequest<unknown>,
  auth: AuthService,
  storage: TokenStorageService,
  queue: RefreshQueueService,
  router: Router,
  telemetry: ClientTelemetryService,
  http: HttpClient,
  next: Parameters<HttpInterceptorFn>[1],
): Observable<HttpEvent<unknown>> {
  queue.startRefresh();
  telemetry.track('REFRESH_TRIGGERED', { url: originalReq.url });

  const refreshToken = storage.getRefresh();
  if (!refreshToken) {
    return logoutAndRedirect(originalReq, auth, queue, router, telemetry);
  }

  // Llamada manual al endpoint refresh usando HttpClient directo (NO pasa por interceptor)
  // Nota: HttpClient.post es interceptado, pero el interceptor lo trata como public endpoint
  // por estar en /api/auth/refresh, así que NO entrará en loop.
  const refreshUrl = `${environment.apiUrl}/auth/refresh`;
  return http.post<RefreshResponseBody>(refreshUrl, { refreshToken }).pipe(
    switchMap((body) => {
      if (!body || !body.token || !body.refreshToken) {
        return logoutAndRedirect(originalReq, auth, queue, router, telemetry);
      }
      auth.setSession({
        token: body.token,
        refreshToken: body.refreshToken,
        roles: body.roles ?? [],
        permisos: body.permisos ?? [],
      });
      queue.completeRefresh(body.token);
      return next(retryWithToken(originalReq, body.token));
    }),
    catchError(() => logoutAndRedirect(originalReq, auth, queue, router, telemetry)),
  );
}

function logoutAndRedirect(
  originalReq: HttpRequest<unknown>,
  auth: AuthService,
  queue: RefreshQueueService,
  router: Router,
  telemetry: ClientTelemetryService,
): Observable<HttpEvent<unknown>> {
  queue.failRefresh();
  auth.clearSession();
  telemetry.track('REFRESH_FAILED', { url: originalReq.url });
  void router.navigate(['/auth/login'], {
    queryParams: { returnUrl: originalReq.url },
  });
  return throwError(() => new Error('Sesión expirada'));
}
