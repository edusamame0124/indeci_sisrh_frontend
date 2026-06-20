import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import { AsistenciaImportApiService } from '../../services/asistencia-import-api.service';
import { AsistenciaTabService } from '../../services/asistencia-tab.service';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type {
  AsistenciaImportFilaDetalle,
  AsistenciaImportPreview,
  AsistenciaImportResumen,
  SpringPage,
} from '../../models/asistencia-import.model';
import { CargaMasivaCsvPageComponent } from './carga-masiva-csv-page.component';

describe('CargaMasivaCsvPageComponent', () => {
  const periodos: readonly PeriodoPlanillaRow[] = [
    periodo('2026-05', 'CERRADO'),
    periodo('2026-06', 'ABIERTO'),
    periodo('2026-04', 'ABIERTO'),
  ];

  const preview: AsistenciaImportPreview = {
    importacionId: 91,
    periodo: '2026-06',
    nombreArchivo: 'marcador.csv',
    encoding: 'UTF-8',
    hashArchivo: 'abc123',
    filasTotal: 2,
    filasValidas: 2,
    filasValidasLimpias: 2,
    filasAdvertencia: 0,
    filasError: 0,
    filasObservadas: 0,
    empleadosDetectados: 1,
    empleadosConError: 0,
    estadoImportacion: 'BORRADOR_PREVIEW',
    mensaje: 'Vista previa generada.',
    empleados: [
      {
        empleadoId: 7,
        dni: '12345678',
        nombreMarcador: 'Servidor Publico',
        nombreSistema: 'Servidor Publico',
        empleadoEncontrado: true,
        diasLaborados: 2,
        diasFalta: 0,
        totalMinTardanza: 15,
        minutosSalidaAnticipada: 0,
        marcasIncompletas: 0,
        diasObservados: 0,
        remuneracionBase: 2500,
        baseOrigen: 'FALLBACK_SUELDO_BASICO',
        descuentoTardanza: 2.6,
        descuentoFalta: 0,
        descuentoTotal: 2.6,
        estadoCabeceraPropuesto: 'PREVALIDADA',
        conflictoExistente: true,
        advertencias: [],
      },
    ],
    errores: [
      {
        linea: 2,
        dni: '12345678',
        fecha: '2026-06-01',
        severidad: 'VALIDA',
        mensaje: 'Fila valida: DNI encontrado, empleado activo, fecha dentro del periodo y sin incidencias detectadas.',
        contenido: null,
      },
      {
        linea: 3,
        dni: '12345678',
        fecha: '2026-06-02',
        severidad: 'VALIDA',
        mensaje: 'Fila valida: DNI encontrado, empleado activo, fecha dentro del periodo y sin incidencias detectadas.',
        contenido: null,
      },
    ],
  };

  const detalleRow: AsistenciaImportFilaDetalle = {
    id: 1,
    numeroFila: 2,
    empleadoId: 7,
    estado: 'OBSERVADA',
    dni: '12345678',
    empleadoSistema: 'Servidor Publico',
    nombreCsv: 'Servidor Publico',
    fecha: '2026-06-01',
    dia: 'Lun',
    entradaProg: '08:00',
    salidaProg: '17:00',
    marca1: '08:05',
    marca2: '17:00',
    marca3: null,
    marca4: null,
    tardanzaMin: 5,
    refrigerioMin: 60,
    excesoRefrigMin: 0,
    tiempoRefrigMin: 60,
    tiempoAntesSalMin: 0,
    horasTrabMin: 480,
    horasExtra25Min: 0,
    horasExtra35Min: 0,
    horasExtra100Min: 0,
    horasExtraTotalMin: 0,
    observaciones: 'Marca incompleta',
    mensajeValidacion: 'Fila observada: requiere revision de RR. HH.',
    aceptadaObservada: false,
  };

  const detallePage: SpringPage<AsistenciaImportFilaDetalle> = {
    content: [detalleRow],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 25,
  };

  const resumenMock: AsistenciaImportResumen = {
    importacionId: 91,
    nombreArchivo: 'marcador.csv',
    periodo: '2026-06',
    periodoDetectadoIni: '2026-06-01',
    periodoDetectadoFin: '2026-06-02',
    filasLeidas: 2,
    filasValidas: 2,
    filasObservadas: 0,
    filasError: 0,
    empleadosDetectados: 1,
    estado: 'BORRADOR_PREVIEW',
    hashArchivo: 'abc123def456',
    tamanoBytes: 2048,
    duplicadoHashPrevio: true,
    usuario: 'rrhh',
    fechaImportacion: '2026-06-10T10:00:00',
    usuarioValidacion: null,
    fechaValidacion: null,
    usuarioConfirmacion: null,
    fechaConfirmacion: null,
  };

  const periodoApi = {
    listar: vi.fn(() => of(periodos)),
  };
  const importApi = {
    preview: vi.fn(() => of(preview)),
    confirmar: vi.fn(() => of({ ...preview, estadoImportacion: 'CONFIRMADA' as const })),
    detalles: vi.fn(() => of(detallePage)),
    resumen: vi.fn(() => of(resumenMock)),
  };
  const snack = {
    open: vi.fn(),
  };
  const errors = {
    translate: vi.fn(() => 'No se pudo completar la operacion.'),
  };

  beforeEach(async () => {
    periodoApi.listar.mockClear();
    importApi.preview.mockClear();
    importApi.confirmar.mockClear();
    importApi.detalles.mockClear();
    importApi.resumen.mockClear();
    snack.open.mockClear();
    errors.translate.mockClear();

    await TestBed.configureTestingModule({
      imports: [CargaMasivaCsvPageComponent, NoopAnimationsModule],
      providers: [
        { provide: PeriodoPlanillaApiService, useValue: periodoApi },
        { provide: AsistenciaImportApiService, useValue: importApi },
        { provide: MatSnackBar, useValue: snack },
        { provide: ErrorMessageService, useValue: errors },
      ],
    }).compileComponents();
  });

  it('carga solo periodos abiertos y selecciona el mas reciente', () => {
    const fixture = TestBed.createComponent(CargaMasivaCsvPageComponent);

    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.periodos().map((p) => p.periodo)).toEqual(['2026-06', '2026-04']);
    expect(component.periodoSeleccionado()).toBe('2026-06');
    expect(periodoApi.listar).toHaveBeenCalledOnce();
  });

  it('expone la estrategia de reemplazo de periodo completo con ayuda operativa', () => {
    const fixture = TestBed.createComponent(CargaMasivaCsvPageComponent);

    fixture.detectChanges();
    fixture.componentInstance.estrategia.set('REEMPLAZAR_PERIODO_COMPLETO');
    fixture.detectChanges();

    expect(fixture.componentInstance.estrategiaSeleccionada().label)
      .toBe('Reemplazar periodo completo');
    expect(fixture.nativeElement.textContent as string)
      .toContain('Esta accion reemplazara la asistencia del periodo');
  });

  it('genera preview desde backend y confirma usando la estrategia seleccionada', () => {
    const fixture = TestBed.createComponent(CargaMasivaCsvPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.archivo.set(new File(['csv'], 'marcador.csv', { type: 'text/csv' }));
    component.generarPreview();
    component.estrategia.set('REEMPLAZAR_PERIODO_COMPLETO');
    component.confirmar();

    expect(importApi.preview).toHaveBeenCalledWith('2026-06', component.archivo());
    expect(importApi.confirmar).toHaveBeenCalledWith(91, 'REEMPLAZAR_PERIODO_COMPLETO', undefined);
    expect(component.preview()?.estadoImportacion).toBe('CONFIRMADA');
  });

  it('carga resumen y detalle server-side al validar, y recarga al cambiar filtros', () => {
    const fixture = TestBed.createComponent(CargaMasivaCsvPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.archivo.set(new File(['csv'], 'marcador.csv', { type: 'text/csv' }));
    component.generarPreview();

    expect(importApi.resumen).toHaveBeenCalledWith(91);
    expect(importApi.detalles).toHaveBeenCalledWith(91, expect.any(Object), 0, 25);
    expect(component.detalleRows()).toHaveLength(1);
    expect(component.detalleTotal()).toBe(1);
    expect(component.resumen()?.duplicadoHashPrevio).toBe(true);

    importApi.detalles.mockClear();
    component.onFiltroEstadoChange('OBSERVADA');

    expect(importApi.detalles).toHaveBeenCalledWith(
      91,
      expect.objectContaining({ estado: 'OBSERVADA' }),
      0,
      25,
    );
  });

  it('al filtrar solo errores/observados envia el flag al backend', () => {
    const fixture = TestBed.createComponent(CargaMasivaCsvPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.archivo.set(new File(['csv'], 'marcador.csv', { type: 'text/csv' }));
    component.generarPreview();

    importApi.detalles.mockClear();
    component.onSoloErroresChange(true);

    expect(importApi.detalles).toHaveBeenCalledWith(
      91,
      expect.objectContaining({ soloErrores: true }),
      0,
      25,
    );
  });

  it('verRegistroDiario navega a consulta diaria con DNI único', () => {
    const tabs = TestBed.inject(AsistenciaTabService);
    const fixture = TestBed.createComponent(CargaMasivaCsvPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.archivo.set(new File(['csv'], 'marcador.csv', { type: 'text/csv' }));
    component.generarPreview();
    component.verRegistroDiario();

    expect(tabs.selectedTab()).toBe(2);
    expect(tabs.preselectDni()).toBe('12345678');
    expect(tabs.preselectFecha()).toMatch(/^2026-06-/);
  });
});

function periodo(periodoValue: string, estado: PeriodoPlanillaRow['estado']): PeriodoPlanillaRow {
  return {
    id: Number(periodoValue.replace('-', '')),
    periodo: periodoValue,
    fechaInicio: `${periodoValue}-01`,
    fechaFin: `${periodoValue}-30`,
    estado,
    observacion: '',
    fechaCierre: null,
    activo: 1,
  };
}
