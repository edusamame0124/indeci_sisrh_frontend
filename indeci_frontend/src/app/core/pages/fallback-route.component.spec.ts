import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FallbackRouteComponent } from './fallback-route.component';
import { AuthService } from '../services/auth.service';

describe('FallbackRouteComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FallbackRouteComponent],
      providers: [provideRouter([])],
    });
  });

  it('navega a login con returnUrl cuando no está autenticado', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/empleados/expedientes');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);

    const fixture = TestBed.createComponent(FallbackRouteComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/empleados/expedientes' },
    });
  });

  it('navega al inicio cuando ya hay sesión', async () => {
    const router = TestBed.inject(Router);
    const navigateByUrlSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);

    const fixture = TestBed.createComponent(FallbackRouteComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/');
  });
});
