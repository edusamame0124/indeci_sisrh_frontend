import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, type ParamMap } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Subject, of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmpleadoConceptosListPageComponent } from './empleado-conceptos-list-page.component';
import { EmpleadoFlowBackendSyncService } from '../../services/empleado-flow-backend-sync.service';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

describe('EmpleadoConceptosListPageComponent', () => {
  let httpMock: HttpTestingController;
  let paramMap$: Subject<ParamMap>;

  beforeEach(() => {
    paramMap$ = new Subject<ParamMap>();
    TestBed.configureTestingModule({
      imports: [EmpleadoConceptosListPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMap$.asObservable() },
        },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
        {
          provide: EmpleadoFlowBackendSyncService,
          useValue: { syncCompletedStepsFromBackend: () => of(undefined) },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    paramMap$.complete();
  });

  it('muestra aviso si la persona no tiene empleadoId', () => {
    const fixture = TestBed.createComponent(EmpleadoConceptosListPageComponent);
    fixture.detectChanges();

    paramMap$.next(convertToParamMap({ personaId: '10' }));
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/rrhh/persona/10');
    const sinEmpleado: PersonaEmpleado = {
      id: 10,
      nombreCompleto: 'PRUEBA',
      dni: '12345678',
      email: 'x@gob.pe',
    };
    req.flush({ estado: 'OK', mensaje: 'ok', data: sinEmpleado });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No hay registro de empleado vinculado');
  });

  it('muestra tabla y acción de alta cuando existe empleadoId', () => {
    const fixture = TestBed.createComponent(EmpleadoConceptosListPageComponent);
    fixture.detectChanges();

    paramMap$.next(convertToParamMap({ personaId: '11' }));
    fixture.detectChanges();
    const reqPersona = httpMock.expectOne('/api/rrhh/persona/11');
    const conEmpleado: PersonaEmpleado = {
      id: 11,
      nombreCompleto: 'COLABORADOR',
      dni: '87654321',
      email: 'y@gob.pe',
      empleadoId: 99,
    };
    reqPersona.flush({ estado: 'OK', mensaje: 'ok', data: conEmpleado });
    fixture.detectChanges();

    const reqConceptos = httpMock.expectOne('/api/rrhh/empleado-concepto/99');
    reqConceptos.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [
        {
          id: 1,
          conceptoPlanillaId: 5,
          concepto: 'HABER BASE',
          monto: 1500.5,
          porcentaje: null,
          formula: null,
          activo: 1,
        },
      ],
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Conceptos asignados');
    expect(el.textContent).toContain('HABER BASE');
    expect(el.textContent).toContain('Asignar concepto');
    expect(el.querySelector('[aria-label="Editar concepto asignado"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="Eliminar concepto asignado"]')).toBeTruthy();
  });
});
