import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ChangePasswordRequest } from '../models/change-password.model';
import { LoginRequest, LoginResponse } from '../models/login.model';
import { LogoutRequest } from '../models/logout.model';
import { OtpEnrollResponse, OtpRequest } from '../models/otp.model';
import { RefreshRequest } from '../models/refresh.model';

/**
 * Cliente HTTP de `/api/auth/*` del backend SISRH (incluye logout Spec 008).
 * Ver `specs/001-frontend-auth/contracts/auth-api.contract.md` para el contrato base.
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

  /** E3: Confirmar OTP. Sirve para enroll (primer código) y validación normal. */
  confirmOtp(req: OtpRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/otp/confirm`, req);
  }

  /** E4: Cambiar clave forzado. Requiere Authorization Bearer cambio-clave. */
  changePassword(req: ChangePasswordRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/cambiar-clave`, req);
  }

  /** E5: Renovación de tokens con rotación. NO requiere Authorization (refresh va en body). */
  refresh(req: RefreshRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/refresh`, req);
  }

  /** Revoca refresh token en servidor (Spec 008). No requiere Authorization. */
  logout(req: LogoutRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, req);
  }
}
