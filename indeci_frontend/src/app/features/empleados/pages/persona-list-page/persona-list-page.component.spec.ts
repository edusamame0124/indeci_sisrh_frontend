import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import {
  PERSONA_QUICK_ACCESS,
  PersonaListPageComponent,
} from './persona-list-page.component';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

describe('PersonaListPageComponent — quick-access columns', () => {
  let httpMock: HttpTestingController;

  function provideBreakpointStub(matches: boolean) {
    return {
      provide: BreakpointObserver,
      useValue: { observe: () => of({ matches, breakpoints: {} }) },
    };
  }

  function buildFixture(matches = false) {
    TestBed.configureTestingModule({
      imports: [PersonaListPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideBreakpointStub(matches),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(PersonaListPageComponent);
  }

  function flushList(rows: PersonaEmpleado[]): void {
    httpMock.expectOne('/api/rrhh/persona').flush({ data: rows });
  }

  const personaActiva: PersonaEmpleado = {
    id: 41,
    nombreCompleto: 'Juan Pérez',
    dni: '12345678',
    email: 'jp@example.com',
    codigoInterno: 'EMP00041',
    estado: 'ACTIVO',
  };

  const personaInactiva: PersonaEmpleado = {
    id: 42,
    nombreCompleto: 'María López',
    dni: '87654321',
    email: 'ml@example.com',
    codigoInterno: 'EMP00042',
    estado: 'INACTIVO',
  };

  afterEach(() => {
    httpMock?.verify();
    TestBed.resetTestingModule();
  });

  it('declara la constante PERSONA_QUICK_ACCESS con los 5 módulos en el orden pedido', () => {
    const keys = PERSONA_QUICK_ACCESS.map((qa) => qa.key);
    expect(keys).toEqual(['puesto', 'cuentaBancaria', 'pension', 'planilla', 'conceptos']);

    const segments = PERSONA_QUICK_ACCESS.map((qa) => qa.segment);
    expect(segments).toEqual([
      'puesto',
      'cuentas-bancarias',
      'pension',
      'planilla',
      'conceptos',
    ]);
  });

  it('renderiza las 10 columnas en orden (desktop ≥1024px)', () => {
    const fixture = buildFixture(false);
    fixture.detectChanges();
    flushList([personaActiva]);
    fixture.detectChanges();

    expect(fixture.componentInstance.columns()).toEqual([
      'nombreCompleto',
      'dni',
      'codigoInterno',
      'estado',
      'puesto',
      'cuentaBancaria',
      'pension',
      'planilla',
      'conceptos',
      'acciones',
    ]);
  });

  it('colapsa a columna única "accesos" en modo compact (<1024px)', () => {
    const fixture = buildFixture(true);
    fixture.detectChanges();
    flushList([personaActiva]);
    fixture.detectChanges();

    expect(fixture.componentInstance.columns()).toEqual([
      'nombreCompleto',
      'dni',
      'estado',
      'accesos',
      'acciones',
    ]);
  });

  it('genera hrefs RouterLink correctos para cada quick-access', () => {
    const fixture = buildFixture(false);
    fixture.detectChanges();
    flushList([personaActiva]);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    const expected: Record<string, string> = {
      'puesto laboral': '/empleados/puesto/personas/41',
      'cuenta bancaria': '/empleados/cuentas-bancarias/personas/41',
      pensión: '/empleados/pension/personas/41',
      planilla: '/empleados/planilla/personas/41',
      'conceptos asignados': '/empleados/conceptos/personas/41',
    };

    for (const [label, href] of Object.entries(expected)) {
      const link = host.querySelector<HTMLAnchorElement>(
        `a[aria-label="Ir a ${label} de Juan Pérez"]`,
      );
      expect(link, `enlace para ${label}`).toBeTruthy();
      expect(link!.getAttribute('href')).toBe(href);
    }
  });

  it('mantiene los 5 atajos visibles en personas INACTIVAS y marca la celda con data-inactive', () => {
    const fixture = buildFixture(false);
    fixture.detectChanges();
    flushList([personaInactiva]);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    const inactiveLinks = host.querySelectorAll<HTMLAnchorElement>('a.row-action--quick');
    expect(inactiveLinks.length).toBe(PERSONA_QUICK_ACCESS.length);

    const markedCells = host.querySelectorAll('td[data-inactive="true"]');
    expect(markedCells.length).toBe(PERSONA_QUICK_ACCESS.length);
  });

  it('helper isInactive distingue ACTIVO/INACTIVO', () => {
    const fixture = buildFixture(false);
    const comp = fixture.componentInstance;
    expect(comp.isInactive({ estado: 'ACTIVO' })).toBe(false);
    expect(comp.isInactive({ estado: 'INACTIVO' })).toBe(true);
    expect(comp.isInactive({ estado: 'inactivo' })).toBe(true);
    expect(comp.isInactive({ estado: null })).toBe(false);

    flushList([]);
  });
});
