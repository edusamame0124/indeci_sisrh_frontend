import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ClientTelemetryService } from '../../core/services/client-telemetry.service';

describe('MainLayoutComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideAnimationsAsync('noop'),
        provideRouter([]),
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: false, breakpoints: {} }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            permisos: () => [],
            roles: () => [],
            username: () => 'usuario.prueba',
            claims: () => ({
              sub: 'usuario.prueba',
              iat: 1,
              exp: Math.floor(Date.now() / 1000) + 7200,
              otpValidado: true,
              newPassOk: true,
              roles: [],
              permisos: [],
            }),
            isAuthenticated: () => true,
          },
        },
        {
          provide: ClientTelemetryService,
          useValue: {
            track: () => undefined,
          },
        },
      ],
    });
  });

  it('muestra Inicio y oculta Personas sin rol RRHH', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.textContent ?? '').toContain('Inicio');
    expect(root.textContent ?? '').not.toContain('Personas');
  });

  it('muestra Personas cuando el rol es ADMIN', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideAnimationsAsync('noop'),
        provideRouter([]),
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: false, breakpoints: {} }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            permisos: () => [],
            roles: () => ['ADMIN'],
            username: () => 'admin.test',
            claims: () => ({
              sub: 'admin.test',
              iat: 1,
              exp: Math.floor(Date.now() / 1000) + 7200,
              otpValidado: true,
              newPassOk: true,
              roles: ['ADMIN'],
              permisos: [],
            }),
            isAuthenticated: () => true,
          },
        },
        {
          provide: ClientTelemetryService,
          useValue: {
            track: () => undefined,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent ?? '').toContain('Personas');
    expect((fixture.nativeElement as HTMLElement).textContent ?? '').toContain(
      'Cuentas bancarias',
    );
    expect((fixture.nativeElement as HTMLElement).textContent ?? '').toContain('Pensión');
    expect((fixture.nativeElement as HTMLElement).textContent ?? '').toContain('Catálogos');
  });
});
