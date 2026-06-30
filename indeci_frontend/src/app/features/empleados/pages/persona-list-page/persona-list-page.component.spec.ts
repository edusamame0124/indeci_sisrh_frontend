import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { PersonaListPageComponent } from './persona-list-page.component';
import type { PersonaResumen } from '../../models/persona-empleado.model';

describe('PersonaListPageComponent — columnas de la tabla', () => {
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

  function flushList(rows: PersonaResumen[]): void {
    httpMock.expectOne((req) => req.url === '/api/rrhh/persona/page').flush({
      estado: 'OK',
      mensaje: 'Éxito',
      data: {
        content: rows,
        totalElements: rows.length,
        totalPages: 1,
        pageNumber: 0,
        pageSize: 20
      }
    });
  }

  const personaActiva: PersonaResumen = {
    id: 41,
    nombreCompleto: 'Juan Pérez',
    dni: '12345678',
    codigoInterno: 'EMP00041',
    estado: 'ACTIVO',
  };

  const personaInactiva: PersonaResumen = {
    id: 42,
    nombreCompleto: 'María López',
    dni: '87654321',
    codigoInterno: 'EMP00042',
    estado: 'INACTIVO',
  };

  afterEach(() => {
    httpMock?.verify();
    TestBed.resetTestingModule();
  });

  it('renderiza las 8 columnas en orden (desktop ≥1024px)', () => {
    const fixture = buildFixture(false);
    fixture.detectChanges();
    flushList([personaActiva]);
    fixture.detectChanges();

    expect(fixture.componentInstance.columns()).toEqual([
      'nombreCompleto',
      'dni',
      'codigoInterno',
      'estado',
      'datosEmpleado',
      'conceptos',
      'suspension4ta',
      'acciones',
    ]);
  });

  it('colapsa a columnas reducidas en modo compact (<1024px)', () => {
    const fixture = buildFixture(true);
    fixture.detectChanges();
    flushList([personaActiva]);
    fixture.detectChanges();

    expect(fixture.componentInstance.columns()).toEqual([
      'nombreCompleto',
      'dni',
      'estado',
      'datosEmpleado',
      'acciones',
    ]);
  });

  it('genera hrefs RouterLink correctos para los accesos del empleado', () => {
    const fixture = buildFixture(false);
    fixture.detectChanges();
    flushList([personaActiva]);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    
    // Ver Datos
    const linkDatos = host.querySelector<HTMLAnchorElement>('a.btn-datos-empleado');
    expect(linkDatos).toBeTruthy();
    expect(linkDatos!.getAttribute('href')).toBe('/empleados/datos/41');

    // Conceptos
    const linkConceptos = host.querySelector<HTMLAnchorElement>('a[aria-label="Ver conceptos de Juan Pérez"]');
    expect(linkConceptos).toBeTruthy();
    expect(linkConceptos!.getAttribute('href')).toBe('/empleados/conceptos/personas/41');

    // Suspensión 4ta
    const linkSuspension = host.querySelector<HTMLAnchorElement>('a[aria-label="Suspensión 4ta de Juan Pérez"]');
    expect(linkSuspension).toBeTruthy();
    expect(linkSuspension!.getAttribute('href')).toBe('/empleados/suspension-4ta/personas/41');
  });

  it('marca las celdas como inactivas en personas INACTIVAS', () => {
    const fixture = buildFixture(false);
    fixture.detectChanges();
    flushList([personaInactiva]);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    const markedCells = host.querySelectorAll('td[data-inactive="true"]');
    // Esperamos 3 celdas marcadas como inactivo (datosEmpleado, conceptos, suspension4ta)
    expect(markedCells.length).toBe(3);
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
