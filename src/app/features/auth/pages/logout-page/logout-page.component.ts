import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { AuthApiService } from '../../services/auth-api.service';

/**
 * Logout: revoca refresh en backend (si existe) y limpia sesión local (FR-029, Spec 008).
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
    const rt = this.auth.refreshToken();
    if (rt) {
      this.api.logout({ refreshToken: rt }).subscribe({
        next: () => this.finalize(),
        error: () => this.finalize(),
      });
      return;
    }
    this.finalize();
  }

  private finalize(): void {
    this.telemetry.track('HEADER_LOGOUT', { url: typeof window !== 'undefined' ? window.location.href : undefined });
    this.auth.clearSession();
    void this.router.navigate(['/auth/login']);
  }
}
