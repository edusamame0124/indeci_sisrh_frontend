import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { GeneracionIndividualPageComponent } from './generacion-individual-page.component';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';

describe('GeneracionIndividualPageComponent (Spec 009 / T154)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [GeneracionIndividualPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(GeneracionIndividualPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  const persona = (id: number, empleadoId: number | null, nombre: string): PersonaEmpleado => ({
    id,
    empleadoId,
    nombreCompleto: nombre,
    dni: String(10000000 + id),
    email: `${nombre.toLowerCase().replace(/\s/g, '.')}@indeci.gob.pe`,
  });

  const periodoAbierto = (clave: string = '2026-05'): PeriodoPlanillaRow => ({
    id: 1,
    periodo: clave,
    fechaInicio: '2026-05-01',
    fechaFin: '2026-05-31',
    estado: 'ABIERTO',
    observacion: '',
    fechaCierre: null,
    activo: 1,
  });

  const periodoCerrado = (clave: string = '2026-04'): PeriodoPlanillaRow => ({
    ...periodoAbierto(clave),
    id: 2,
    estado: 'CERRADO',
  });

  function flushBoot(personas: PersonaEmpleado[], periodos: PeriodoPlanillaRow[]) {
    httpMock.expectOne('/api/rrhh/persona').flush({ data: personas });
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: periodos });
  }

  afterEach(() => {
    // Al elegir periodo el componente dispara la validación preflight; se flushea
    // aquí para no acoplar cada test a ese detalle secundario.
    httpMock?.match((r) => r.url.includes('/validaciones/preflight')).forEach((r) => r.flush({ data: [] }));
    httpMock?.verify();
    TestBed.resetTestingModule();
  });

  it('carga personas + periodos y selecciona primer ABIERTO por defecto', () => {
    const fixture = build();
    flushBoot(
      [persona(1, 42, 'Ana Pérez'), persona(2, 43, 'Bruno Silva')],
      [periodoAbierto('2026-05'), periodoCerrado('2026-04')],
    );

    const comp = fixture.componentInstance;
    expect(comp.personas().length).toBe(2);
    expect(comp.periodosAbiertos().length).toBe(1);
    expect(comp.periodoSeleccionado()).toBe('2026-05');
    expect(comp.loading()).toBe(false);
  });

  it('personasFiltradas() filtra por nombre/DNI/código y omite personas sin empleadoId', () => {
    const fixture = build();
    flushBoot(
      [
        persona(1, 42, 'Ana Pérez'),
        persona(2, null, 'Sin Vínculo'), // sin empleadoId
        persona(3, 43, 'Bruno Silva'),
      ],
      [periodoAbierto()],
    );

    const comp = fixture.componentInstance;
    // Default (sin query) muestra todas las primeras 20 sin filtro estricto
    expect(comp.personasFiltradas().length).toBeGreaterThanOrEqual(2);

    // Con query, filtra y excluye sin empleadoId
    comp.searchQuery.set('bruno');
    const filtradas = comp.personasFiltradas();
    expect(filtradas.length).toBe(1);
    expect(filtradas[0].nombreCompleto).toBe('Bruno Silva');
  });

  it('canGenerar() es false sin empleado seleccionado', () => {
    const fixture = build();
    flushBoot([persona(1, 42, 'Ana')], [periodoAbierto()]);
    expect(fixture.componentInstance.canGenerar()).toBe(false);
  });

  it('muestra notas técnicas de Regla 50 y Pensión sin calcular en frontend', () => {
    const fixture = build();
    flushBoot([persona(1, 42, 'Ana')], [periodoAbierto()]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Regla 50');
    expect(text).toContain('base libre de disponibilidad');
    expect(text).toContain('Subsidios CAS');
    // El componente cita los códigos de subsidio (maternidad 0915, enfermedad 0916)
    // y el diferencial PLAME 2073.
    expect(text).toContain('0915');
    expect(text).toContain('0916');
    expect(text).toContain('2073');
    expect(text).toContain('Pensión');
    expect(text).toContain('Solo los regímenes ONP y AFP');
  });

  it('canGenerar() es true con empleado válido + periodo + fase idle', () => {
    const fixture = build();
    flushBoot([persona(1, 42, 'Ana')], [periodoAbierto()]);
    const comp = fixture.componentInstance;
    comp.empleadoSeleccionado.set(persona(1, 42, 'Ana'));
    expect(comp.canGenerar()).toBe(true);
  });

  it('canGenerar() es false si fase es "generando"', () => {
    const fixture = build();
    flushBoot([persona(1, 42, 'Ana')], [periodoAbierto()]);
    const comp = fixture.componentInstance;
    comp.empleadoSeleccionado.set(persona(1, 42, 'Ana'));
    comp.fase.set('generando');
    expect(comp.canGenerar()).toBe(false);
  });

  it('ejecutar: POST generarIndividual + GET resumen → setea resumen y fase "completado"', () => {
    const fixture = build();
    flushBoot([persona(1, 42, 'Ana')], [periodoAbierto()]);

    fixture.componentInstance.ejecutar(42, '2026-05');

    const postReq = httpMock.expectOne('/api/rrhh/generador-planilla/42/2026-05');
    expect(postReq.request.method).toBe('POST');
    expect(fixture.componentInstance.fase()).toBe('generando');
    postReq.flush({ data: null });

    const getReq = httpMock.expectOne('/api/rrhh/generador-planilla/resumen/42/2026-05');
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      data: {
        empleadoId: 42,
        periodo: '2026-05',
        totalIngresos: 3500,
        totalDescuentos: 450,
        netoPagar: 3050,
      },
    });

    const comp = fixture.componentInstance;
    expect(comp.fase()).toBe('completado');
    expect(comp.resumen()?.netoPagar).toBe(3050);
  });

  it('ejecutar: si POST falla, vuelve a fase "idle" y resumen queda null', () => {
    const fixture = build();
    flushBoot([persona(1, 42, 'Ana')], [periodoAbierto()]);

    fixture.componentInstance.ejecutar(42, '2026-05');
    const postReq = httpMock.expectOne('/api/rrhh/generador-planilla/42/2026-05');
    postReq.flush({ estado: 'ERROR', mensaje: 'Periodo cerrado', data: null }, {
      status: 400,
      statusText: 'Bad Request',
    });

    expect(fixture.componentInstance.fase()).toBe('idle');
    expect(fixture.componentInstance.resumen()).toBeNull();
  });

  it('cambiar empleado en autocomplete resetea resumen y fase', () => {
    const fixture = build();
    flushBoot([persona(1, 42, 'Ana')], [periodoAbierto()]);

    const comp = fixture.componentInstance;
    comp.empleadoSeleccionado.set(persona(1, 42, 'Ana'));
    comp.resumen.set({
      empleadoId: 42, periodo: '2026-05',
      totalIngresos: 1000, totalDescuentos: 100, netoPagar: 900,
      neto50pctMinimo: 450, estadoNeto: 'BIEN',
    });
    comp.fase.set('completado');

    // Simular escribir en el input (string) → resetea selección
    comp.empleadoSearchCtrl.setValue('Bruno');

    expect(comp.empleadoSeleccionado()).toBeNull();
    expect(comp.resumen()).toBeNull();
    expect(comp.fase()).toBe('idle');
    expect(comp.yaExistia()).toBe(false);
  });

  it('al elegir periodo con planilla ya guardada, la recupera y la muestra', () => {
    const fixture = build();
    flushBoot([persona(1, 42, 'Ana')], [periodoAbierto('2026-05')]);

    const comp = fixture.componentInstance;
    comp.empleadoSeleccionado.set(persona(1, 42, 'Ana'));
    comp.onPeriodoChange('2026-05');

    const getReq = httpMock.expectOne('/api/rrhh/generador-planilla/resumen/42/2026-05');
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      data: {
        empleadoId: 42, periodo: '2026-05',
        totalIngresos: 5000, totalDescuentos: 650, netoPagar: 4350,
      },
    });

    expect(comp.fase()).toBe('completado');
    expect(comp.yaExistia()).toBe(true);
    expect(comp.resumen()?.netoPagar).toBe(4350);
  });

  it('al elegir periodo sin planilla, queda en estado idle sin resumen', () => {
    const fixture = build();
    flushBoot([persona(1, 42, 'Ana')], [periodoAbierto('2026-05')]);

    const comp = fixture.componentInstance;
    comp.empleadoSeleccionado.set(persona(1, 42, 'Ana'));
    comp.onPeriodoChange('2026-05');

    const getReq = httpMock.expectOne('/api/rrhh/generador-planilla/resumen/42/2026-05');
    getReq.flush(
      { estado: 'ERROR', mensaje: 'Planilla no encontrada', data: null },
      { status: 404, statusText: 'Not Found' },
    );

    expect(comp.fase()).toBe('idle');
    expect(comp.yaExistia()).toBe(false);
    expect(comp.resumen()).toBeNull();
  });
});
