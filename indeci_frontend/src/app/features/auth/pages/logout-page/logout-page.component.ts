import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { AuthApiService } from '../../services/auth-api.service';

/**
 * Logout: revoca el refresh token en backend y limpia la sesión local
 * (FR-029, Spec 008). Spec 013 / C4 — el refresh token viaja en la cookie
 * HttpOnly, así que `logout()` no necesita pasarlo: el navegador la adjunta.
 */
@Component({
  selector: 'app-logout-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Cerrando sesión...</p>`,
})
export class LogoutPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly telemetry = inject(ClientTelemetryService);
  private readonly api = inject(AuthApiService);

  ngOnInit(): void {
    this.api.logout().subscribe({
      next: () => this.finalize(),
      error: () => this.finalize(),
    });
  }

  private finalize(): void {
    this.telemetry.track('HEADER_LOGOUT', { url: typeof window !== 'undefined' ? window.location.href : undefined });
    this.auth.clearSession();
    void this.router.navigate(['/auth/login']);
  }
}
