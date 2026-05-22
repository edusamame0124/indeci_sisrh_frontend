import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Ruta comodín: preserva deep links hacia `/auth/login?returnUrl=...`
 * cuando el usuario no está autenticado; si ya hay sesión, vuelve al inicio protegido.
 */
@Component({
  selector: 'app-fallback-route',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<!-- navegación inmediata; sin UI visible -->`,
  styles: [':host { display: none; }'],
})
export class FallbackRouteComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/');
      return;
    }
    void this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: this.router.url },
    });
  }
}
