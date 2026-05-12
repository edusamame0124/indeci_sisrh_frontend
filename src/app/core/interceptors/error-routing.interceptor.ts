import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { isErrorResponse } from '../models/error-response.model';

/**
 * Interceptor que enruta automáticamente respuestas 403 con mensajes específicos
 * del backend al flujo correcto del frontend (FR-027).
 *
 * - 403 'Debe validar OTP'         → /auth/otp
 * - 403 'Debe cambiar contraseña'  → /auth/cambiar-clave
 * - 403 'Usuario inactivo'         → /auth/cuenta-inactiva
 *
 * Los 400 con `requiereCaptcha=true` y los 200 con flags (requiereOtp/requiereEnroll/newPass)
 * NO se manejan aquí porque son responsabilidad del LoginFlowService desde el componente
 * que dispara la petición (es responder a un flujo, no a una redirección de seguridad).
 */
export const errorRoutingInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 403) {
        return throwError(() => error);
      }

      const body = error.error;
      if (!isErrorResponse(body)) {
        return throwError(() => error);
      }

      switch (body.mensaje) {
        case 'Debe validar OTP':
          void router.navigate(['/auth/otp']);
          break;
        case 'Debe cambiar contraseña':
          void router.navigate(['/auth/cambiar-clave']);
          break;
        case 'Usuario inactivo':
          void router.navigate(['/auth/cuenta-inactiva']);
          break;
        // Otros 403 (refresh inválido) los maneja authInterceptor o el caller
      }

      return throwError(() => error);
    }),
  );
};
