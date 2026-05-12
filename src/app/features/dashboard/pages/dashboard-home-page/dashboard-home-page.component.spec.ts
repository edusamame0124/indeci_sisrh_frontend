import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DashboardHomePageComponent } from './dashboard-home-page.component';
import { AuthService } from '../../../../core/services/auth.service';

describe('DashboardHomePageComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardHomePageComponent],
      providers: [
        provideAnimationsAsync('noop'),
        {
          provide: AuthService,
          useValue: {
            username: () => 'usuario.prueba',
            roles: () => ['RRHH_ADMIN'],
          },
        },
      ],
    });
  });

  it('shows welcome and username', () => {
    const fixture = TestBed.createComponent(DashboardHomePageComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(el.textContent ?? '').toContain('Bienvenido al SISRH-INDECI');
    expect(el.textContent ?? '').toContain('usuario.prueba');
    expect(el.textContent ?? '').toContain('RRHH_ADMIN');
  });
});
