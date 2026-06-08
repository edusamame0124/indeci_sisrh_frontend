import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import { AsistenciaImportApiService } from '../../services/asistencia-import-api.service';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type { AsistenciaImportPreview } from '../../models/asistencia-import.model';
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

  const previewConIncidencias: AsistenciaImportPreview = {
    ...preview,
    filasTotal: 4,
    filasValidas: 2,
    filasValidasLimpias: 1,
    filasAdvertencia: 1,
    filasError: 1,
    filasObservadas: 1,
    empleadosConError: 1,
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
        severidad: 'WARN',
        mensaje: 'El nombre del marcador difiere del registrado en el sistema. No bloquea la carga porque la identificacion principal es el DNI.',
        contenido: null,
      },
      {
        linea: 4,
        dni: '12345678',
        fecha: '2026-06-03',
        severidad: 'OBSERVADA',
        mensaje: 'Fila observada: no registra marcas de entrada ni salida. Requiere revision de RR. HH.',
        contenido: null,
      },
      {
        linea: 5,
        dni: '00000000',
        fecha: '2026-06-04',
        severidad: 'ERROR',
        mensaje: 'Empleado no registrado en el sistema (DNI no encontrado).',
        contenido: null,
      },
    ],
  };

  const periodoApi = {
    listar: vi.fn(() => of(periodos)),
  };
  const importApi = {
    preview: vi.fn(() => of(preview)),
    confirmar: vi.fn(() => of({ ...preview, estadoImportacion: 'CONFIRMADA' as const })),
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
    expect(importApi.confirmar).toHaveBeenCalledWith(91, 'REEMPLAZAR_PERIODO_COMPLETO');
    expect(component.preview()?.estadoImportacion).toBe('CONFIRMADA');
  });

  it('filtra filas del preview por estado y pagina sin renderizar toda la lista', () => {
    const fixture = TestBed.createComponent(CargaMasivaCsvPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.preview.set(previewConIncidencias);
    component.pageSize.set(2);
    fixture.detectChanges();

    expect(component.totalFiltro('TODOS')).toBe(4);
    expect(component.totalFiltro('VALIDA')).toBe(1);
    expect(component.totalFiltro('WARN')).toBe(1);
    expect(component.totalFiltro('OBSERVADA')).toBe(1);
    expect(component.totalFiltro('ERROR')).toBe(1);
    expect(component.filasPaginadas().length).toBe(2);

    component.cambiarFiltro('OBSERVADA');

    expect(component.filasFiltradas()).toHaveLength(1);
    expect(component.filasFiltradas()[0]?.mensaje).toContain('Requiere revision de RR. HH.');
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
