import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { CargaAsistenciaPageComponent } from './carga-asistencia-page.component';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { AsistenciaDia, AsistenciaResponse } from '../../models/asistencia.model';

describe('CargaAsistenciaPageComponent (Spec 010 PANTALLA-02)', () => {
  let httpMock: HttpTestingController;

  function build() {
    TestBed.configureTestingModule({
      imports: [CargaAsistenciaPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CargaAsistenciaPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    httpMock.verify();
  });

  // PerÃ­odo corto: 2026-05-01 (vie) â€¦ 2026-05-07 (jue) â†’ 02 y 03 son fin de semana.
  const periodoAbierto = (): PeriodoPlanillaRow => ({
    id: 1,
    periodo: '2026-05',
    fechaInicio: '2026-05-01',
    fechaFin: '2026-05-07',
    estado: 'ABIERTO',
    observacion: '',
    fechaCierre: null,
    activo: 1,
  });

  const persona = (
    empleadoId: number | null,
    nombre: string,
  ): PersonaEmpleado => ({
    id: (empleadoId ?? 0) + 1000,
    empleadoId,
    nombreCompleto: nombre,
    dni: `DNI${empleadoId ?? 'X'}`,
    email: '',
  });

  const asistencia = (
    empleadoId: number,
    remuneracionBase: number | null = null,
    dias: AsistenciaDia[] = [],
  ): AsistenciaResponse => ({
    id: null,
    empleadoId,
    periodo: '2026-05',
    remuneracionBase,
    diasLaborados: 0,
    diasFalta: 0,
    totalMinTardanza: 0,
    descuentoTardanza: 0,
    descuentoFalta: 0,
    estado: 'BORRADOR',
    observacion: null,
    dias,
  });

  /** Arranca el componente y deja perÃ­odo + empleados cargados. */
  function conPeriodo(personas: PersonaEmpleado[] = [persona(42, 'Ana Lopez'), persona(7, 'Carlos Ruiz')]) {
    const fixture = build();
    httpMock.expectOne('/api/rrhh/periodo-planilla').flush({ data: [periodoAbierto()] });
    httpMock.expectOne('/api/rrhh/persona').flush({ data: personas });
    return fixture;
  }

  it('al cargar pide periodos y personas, selecciona el ABIERTO y lista empleados', () => {
    const comp = conPeriodo().componentInstance;
    expect(comp.periodoSeleccionado()).toBe('2026-05');
    // Ordenados por nombre: Ana Lopez (42), Carlos Ruiz (7)
    expect(comp.empleados().map((e) => e.empleadoId)).toEqual([42, 7]);
  });

  it('excluye del selector a las personas sin vÃ­nculo de empleado', () => {
    const comp = conPeriodo([
      persona(42, 'Ana Lopez'),
      persona(null, 'Persona Sin Empleo'),
    ]).componentInstance;
    expect(comp.empleados().map((e) => e.empleadoId)).toEqual([42]);
  });

  it('al elegir empleado pide su asistencia y construye el calendario del periodo', () => {
    const comp = conPeriodo().componentInstance;
    comp.onEmpleadoChange(42);
    httpMock.expectOne('/api/rrhh/asistencia/42/2026-05').flush({ data: asistencia(42) });

    expect(comp.calendarioListo()).toBe(true);
    // 7 dÃ­as del 2026-05-01 al 2026-05-07
    expect(comp.dias().length).toBe(7);
  });

  it('el calendario respeta los dÃ­as guardados y marca fines de semana como DESCANSO', () => {
    const comp = conPeriodo().componentInstance;
    comp.onEmpleadoChange(42);
    httpMock.expectOne('/api/rrhh/asistencia/42/2026-05').flush({
      data: asistencia(42, 3000, [
        { dia: '2026-05-04', tipoDia: 'FALTA', minutosTardanza: 0, observacion: null },
      ]),
    });

    const dia = (clave: string) => comp.dias().find((d) => d.dia === clave);
    expect(dia('2026-05-01')?.tipoDia).toBe('LABORAL');
    expect(dia('2026-05-02')?.tipoDia).toBe('DESCANSO'); // sÃ¡bado
    expect(dia('2026-05-03')?.tipoDia).toBe('DESCANSO'); // domingo
    expect(dia('2026-05-04')?.tipoDia).toBe('FALTA'); // guardado
  });

  it('resumen() calcula el descuento segÃºn D.Leg. 276 Art. 24 (REGLA 276-02)', () => {
    const comp = conPeriodo().componentInstance;
    comp.onEmpleadoChange(42);
    httpMock.expectOne('/api/rrhh/asistencia/42/2026-05').flush({
      data: asistencia(42, 3000, [
        { dia: '2026-05-01', tipoDia: 'TARDANZA', minutosTardanza: 120, observacion: null },
        { dia: '2026-05-04', tipoDia: 'FALTA', minutosTardanza: 0, observacion: null },
        { dia: '2026-05-05', tipoDia: 'FALTA', minutosTardanza: 0, observacion: null },
      ]),
    });

    const r = comp.resumen();
    expect(r.totalMinTardanza).toBe(120);
    expect(r.diasFalta).toBe(2);
    // TARDANZA (1) + LABORAL 06,07 (2) = 3
    expect(r.diasLaborados).toBe(3);
    // (3000/30/8/60) * 120 = 25.00
    expect(r.descuentoTardanza).toBe(25);
    // (3000/30) * 2 = 200.00
    expect(r.descuentoFalta).toBe(200);
    expect(r.totalDescuento).toBe(225);
  });

  it('cycleTipo() avanza el tipo de dÃ­a al siguiente del ciclo', () => {
    const comp = conPeriodo().componentInstance;
    comp.onEmpleadoChange(42);
    httpMock.expectOne('/api/rrhh/asistencia/42/2026-05').flush({ data: asistencia(42) });

    const lunes = comp.dias().find((d) => d.dia === '2026-05-04')!;
    expect(lunes.tipoDia).toBe('LABORAL');
    comp.cycleTipo(lunes);
    expect(comp.dias().find((d) => d.dia === '2026-05-04')?.tipoDia).toBe('TARDANZA');
  });

  it('no muestra dropzone CSV en la carga individual manual', () => {
    const fixture = conPeriodo();
    const comp = fixture.componentInstance;
    comp.onEmpleadoChange(42);
    httpMock.expectOne('/api/rrhh/asistencia/42/2026-05').flush({ data: asistencia(42) });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sisrh-dropzone')).toBeNull();
  });

  it('descarga el PDF por blob cuando el calendario esta listo', () => {
    const fixture = conPeriodo();
    const comp = fixture.componentInstance;

    expect(comp.puedeDescargarPdf()).toBe(false);

    comp.onEmpleadoChange(42);
    httpMock.expectOne('/api/rrhh/asistencia/42/2026-05').flush({ data: asistencia(42) });
    fixture.detectChanges();

    expect(comp.puedeDescargarPdf()).toBe(true);
    const boton = fixture.nativeElement.querySelector('.acciones__pdf') as HTMLButtonElement;
    expect(boton.textContent).toContain('Descargar PDF');

    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    comp.descargarPdf();
    const req = httpMock.expectOne('/api/rrhh/asistencia/42/2026-05/pdf');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF']));

    expect(clickSpy).toHaveBeenCalled();
    createSpy.mockRestore();
    revokeSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('guardar() hace POST a /api/rrhh/asistencia con los dÃ­as del calendario', () => {
    const comp = conPeriodo().componentInstance;
    comp.onEmpleadoChange(42);
    httpMock.expectOne('/api/rrhh/asistencia/42/2026-05').flush({ data: asistencia(42) });

    comp.guardar();
    const req = httpMock.expectOne('/api/rrhh/asistencia');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.empleadoId).toBe(42);
    expect(req.request.body.periodo).toBe('2026-05');
    expect(req.request.body.dias.length).toBe(7);
    req.flush({ data: null });
  });
});

