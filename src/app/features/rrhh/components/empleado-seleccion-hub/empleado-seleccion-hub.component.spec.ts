import { Component } from '@angular/core';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EmpleadoSeleccionHubComponent } from './empleado-seleccion-hub.component';
import { setMatIconDefaultFontSetForTests } from '../../../../testing/mat-icon-test-defaults';

@Component({ standalone: true, selector: 'app-hub-route-blank', template: '' })
class HubRouteBlankComponent {}

describe('EmpleadoSeleccionHubComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmpleadoSeleccionHubComponent],
      providers: [
        provideAnimationsAsync('noop'),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: HubRouteBlankComponent },
          { path: 'rrhh/cuentas-bancarias/personas/:id', component: HubRouteBlankComponent },
        ]),
        { provide: MatSnackBar, useValue: { open: () => undefined } },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              rrhhHub: {
                title: 'Cuentas bancarias',
                subtitle: 'Sub',
                segment: 'cuentas-bancarias',
              },
            }),
          },
        },
      ],
    });
    setMatIconDefaultFontSetForTests();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('renderiza título desde route data', () => {
    const httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EmpleadoSeleccionHubComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/persona').flush({ estado: 'OK', mensaje: 'ok', data: [] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent ?? '').toContain('Cuentas bancarias');
  });

  it('tabla con scroll, paginador y acciones ícono + aria-label', () => {
    const httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EmpleadoSeleccionHubComponent);
    const host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    const personas = Array.from({ length: 11 }, (_, i) => ({
      id: i + 1,
      empleadoId: i + 100,
      nombreCompleto: `EMPLEADO TEST ${String(i + 1).padStart(2, '0')}`,
      dni: '12345678',
      email: `u${i}@mail.local`,
    }));

    httpMock.expectOne('/api/rrhh/persona').flush({ estado: 'OK', mensaje: 'ok', data: personas });
    fixture.detectChanges();

    expect(host.querySelector('.sisrh-table-scroll table.tbl')).toBeTruthy();

    const paginator = host.querySelector('mat-paginator');
    expect(paginator?.getAttribute('aria-label')).toBe('Paginador de personas');

    const firstRowLink = host.querySelector('td a.mat-mdc-icon-button');
    expect(firstRowLink?.getAttribute('aria-label')).toContain('Ver y editar datos de EMPLEADO TEST');

    const icon = host.querySelector('td a.mat-mdc-icon-button mat-icon');
    expect(icon?.classList.contains('material-symbols-outlined')).toBe(true);
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
