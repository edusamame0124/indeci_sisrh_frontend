import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ChangePasswordRequest } from '../models/change-password.model';
import { LoginRequest, LoginResponse } from '../models/login.model';
import { OtpEnrollResponse, OtpRequest } from '../models/otp.model';

/**
 * Cliente HTTP de `/api/auth/*` del backend SISRH (incluye logout Spec 008).
 * Ver `specs/001-frontend-auth/contracts/auth-api.contract.md` para el contrato base.
 *
 * Spec 013 / C4 — el refresh token viaja en una cookie HttpOnly: las llamadas
 * que la emiten o consumen (confirmOtp, refresh, logout) usan `withCredentials`
 * y NO envían/reciben el token en el cuerpo JSON.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth`;

  /** E1: Login con credenciales. Polimórfico según flags. */
  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/login`, req);
  }

  /** E2: Enroll de OTP (genera QR). Requiere Authorization Bearer temporal. */
  enrollOtp(): Observable<OtpEnrollResponse> {
    return this.http.post<OtpEnrollResponse>(`${this.base}/otp/enroll`, {});
  }

  /** E3: Confirmar OTP. Sirve para enroll (primer código) y validación normal.
   * En éxito el backend emite la cookie HttpOnly del refresh token. */
  confirmOtp(req: OtpRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/otp/confirm`, req, {
      withCredentials: true,
    });
  }

  /** E4: Cambiar clave forzado. Requiere Authorization Bearer cambio-clave. */
  changePassword(req: ChangePasswordRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/cambiar-clave`, req);
  }

  /** E5: Renovación de tokens con rotación. El refresh token va en la cookie
   * HttpOnly (cuerpo vacío + withCredentials). No requiere Authorization. */
  refresh(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/refresh`, {}, {
      withCredentials: true,
    });
  }

  /** Revoca el refresh token en el servidor y borra la cookie (Spec 008). */
  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, {}, { withCredentials: true });
  }
}
