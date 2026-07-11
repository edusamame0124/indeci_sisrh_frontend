import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ClientTelemetryService } from '../../core/services/client-telemetry.service';

function provideAuth(roles: readonly string[], username = 'usuario.prueba') {
  return {
    provide: AuthService,
    useValue: {
      permisos: () => [],
      roles: () => roles,
      username: () => username,
      claims: () => ({
        sub: username,
        iat: 1,
        exp: Math.floor(Date.now() / 1000) + 7200,
        otpValidado: true,
        newPassOk: true,
        roles,
        permisos: [],
      }),
      isAuthenticated: () => true,
    },
  };
}

const commonProviders = [
  provideAnimationsAsync('noop'),
  provideRouter([]),
  {
    provide: BreakpointObserver,
    useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
  },
  {
    provide: ClientTelemetryService,
    useValue: { track: () => undefined },
  },
];

describe('MainLayoutComponent (Spec 009 — sidebar reorganizado)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [...commonProviders, provideAuth([])],
    });
  });

  it('sin rol: muestra Inicio y oculta los 5 módulos', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inicio');
    expect(text).not.toContain('Módulo Vinculación');
    expect(text).not.toContain('Catálogos');
    expect(text).not.toContain('Planilla');
    expect(text).not.toContain('Reportes');
  });

  it('ADMIN ve los 5 módulos y los labels del flujo Empleados', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [...commonProviders, provideAuth(['ADMIN'], 'admin.test')],
    });
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Catálogos');
    expect(text).toContain('Módulo Vinculación');
    expect(text).toContain('Planilla');
    expect(text).toContain('Reportes');
    expect(text).toContain('Administración');
    // Sub-items reales del módulo de vinculación y gestiones del personal
    expect(text).toContain('Datos personales');
    expect(text).toContain('Eventos del período');
    expect(text).toContain('Ficha 360');
    expect(text).toContain('Gestiones del personal');
  });

  it('RRHH_ADMIN ve Catálogos (lectura) y NO ve Reportes ni Administración', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [...commonProviders, provideAuth(['RRHH_ADMIN'], 'rrhh.test')],
    });
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Catálogos');
    expect(text).toContain('Módulo Vinculación');
    expect(text).toContain('Planilla');
    expect(text).not.toContain('Reportes');
    expect(text).not.toContain('Administración');
  });

  it('incluye skip link y main#main-content para accesibilidad (Fase 0)', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const skip = root.querySelector<HTMLAnchorElement>('a.sisrh-skip-link');
    expect(skip).not.toBeNull();
    expect(skip?.getAttribute('href')).toBe('#main-content');
    expect(skip?.textContent?.trim()).toContain('Saltar al contenido principal');
    const main = root.querySelector<HTMLElement>('#main-content');
    expect(main?.tagName.toLowerCase()).toBe('main');
    expect(main?.classList.contains('shell__content')).toBe(true);
  });

  it('toolbar sin color primary de Material (contraste explícito)', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const toolbar = (fixture.nativeElement as HTMLElement).querySelector('mat-toolbar.shell__toolbar');
    expect(toolbar).not.toBeNull();
    expect(toolbar?.getAttribute('color')).toBeNull();
  });

  it('Catálogos muestra 4 subgrupos y campo de filtro (Fase 5)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [...commonProviders, provideAuth(['ADMIN'], 'admin.test')],
    });
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Referencia');
    expect(root.textContent).toContain('Persona y académico');
    expect(root.textContent).toContain('Organización');
    expect(root.textContent).toContain('Planilla y legal');
    expect(root.querySelector('.shell__catalog-search input')).not.toBeNull();
  });

  it('items comingSoon se renderizan como span con aria-disabled (sin routerLink)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [...commonProviders, provideAuth(['ADMIN'], 'admin.test')],
    });
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const comingSoonItems = root.querySelectorAll<HTMLElement>('.shell__nav-coming-soon');
    /* Decisión post-T164: sidebar 100% navegable. Detalle/Resumen/Cierre/Boleta se acceden por CTAs contextuales. */
    expect(comingSoonItems.length).toBe(0);
    // Spec 009 — todos los items implementados deben renderizar como <a>:
    expect(root.querySelector('a[href="/planilla/periodos"]')).not.toBeNull();
    expect(root.querySelector('a[href="/planilla/generacion-masiva"]')).not.toBeNull();
    expect(root.querySelector('a[href="/planilla/generacion-individual"]')).not.toBeNull();
    expect(root.querySelector('a[href="/planilla/movimientos"]')).not.toBeNull();
    expect(root.querySelector('a[href="/reportes/resumen-mensual"]')).not.toBeNull();
    expect(root.querySelector('a[href="/reportes/exportar-excel"]')).not.toBeNull();
    expect(root.querySelector('a[href="/reportes/historial"]')).not.toBeNull();
    // Detalle/Resumen/Cierre/Boleta ya NO están en el sidebar (acceso vía CTA contextual).
    expect(root.querySelector('a[href="/planilla/detalle"]')).toBeNull();
    expect(root.querySelector('a[href="/planilla/resumen"]')).toBeNull();
    expect(root.querySelector('a[href="/planilla/cierre"]')).toBeNull();
    expect(root.querySelector('a[href="/reportes/boleta"]')).toBeNull();
  });
});
