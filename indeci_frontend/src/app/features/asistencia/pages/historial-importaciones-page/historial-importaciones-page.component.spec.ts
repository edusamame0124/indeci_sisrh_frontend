import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { AsistenciaImportApiService } from '../../services/asistencia-import-api.service';
import { MovimientoPlanillaApiService } from '../../../planilla/services/movimiento-planilla-api.service';
import type {
  AsistenciaImportHistorial,
  SpringPage,
} from '../../models/asistencia-import.model';
import { HistorialImportacionesPageComponent } from './historial-importaciones-page.component';

describe('HistorialImportacionesPageComponent', () => {
  const row: AsistenciaImportHistorial = {
    id: 11,
    periodo: '2026-06',
    nombreArchivo: 'marcador.csv',
    usuario: 'rrhh',
    fechaImportacion: '2026-06-07T10:15:00',
    estado: 'CONFIRMADA',
    filasTotal: 10,
    filasValidas: 9,
    filasError: 1,
    empleadosProcesados: 3,
  };

  const page: SpringPage<AsistenciaImportHistorial> = {
    content: [row],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 20,
  };

  const importApi = {
    historial: vi.fn(() => of(page)),
    validarCabeceras: vi.fn(() => of({
      importacionId: 11,
      periodo: '2026-06',
      totalCabeceras: 3,
      validadas: 2,
      omitidas: 0,
      observadas: 1,
      yaValidadas: 0,
    })),
  };
  const movimientoApi = {
    listarPeriodo: vi.fn(() => of([{ id: 99 }])),
  };
  const snack = {
    open: vi.fn(),
  };
  const errors = {
    translate: vi.fn(() => 'No se pudo cargar el historial.'),
  };

  beforeEach(async () => {
    importApi.historial.mockClear();
    importApi.validarCabeceras.mockClear();
    movimientoApi.listarPeriodo.mockClear();
    snack.open.mockClear();
    errors.translate.mockClear();

    await TestBed.configureTestingModule({
      imports: [HistorialImportacionesPageComponent, NoopAnimationsModule],
      providers: [
        { provide: AsistenciaImportApiService, useValue: importApi },
        { provide: MovimientoPlanillaApiService, useValue: movimientoApi },
        { provide: MatSnackBar, useValue: snack },
        { provide: ErrorMessageService, useValue: errors },
      ],
    }).compileComponents();
  });

  it('carga historial al iniciar y muestra la fila recibida', () => {
    const fixture = TestBed.createComponent(HistorialImportacionesPageComponent);

    fixture.detectChanges();

    const component = fixture.componentInstance;
    const text = fixture.nativeElement.textContent as string;
    expect(importApi.historial).toHaveBeenCalledWith(null);
    expect(movimientoApi.listarPeriodo).toHaveBeenCalledWith('2026-06');
    expect(component.rows()).toEqual([row]);
    expect(component.total()).toBe(1);
    expect(text).toContain('marcador.csv');
    expect(text).toContain('CONFIRMADA');
  });

  it('envia el periodo filtrado al servicio', () => {
    const fixture = TestBed.createComponent(HistorialImportacionesPageComponent);
    fixture.detectChanges();
    importApi.historial.mockClear();

    fixture.componentInstance.periodoFiltro.set('2026-06');
    fixture.componentInstance.cargar();

    expect(importApi.historial).toHaveBeenCalledWith('2026-06');
  });

  it('valida cabeceras batch y recarga el historial', () => {
    const fixture = TestBed.createComponent(HistorialImportacionesPageComponent);
    fixture.detectChanges();
    importApi.historial.mockClear();

    fixture.componentInstance.validarCabeceras(row);

    expect(importApi.validarCabeceras).toHaveBeenCalledWith(11);
    expect(snack.open).toHaveBeenCalledWith(
      'Cabeceras validadas: 2. Observadas: 1. El periodo ya tiene planilla generada; ejecute el recálculo para reflejar la asistencia.',
      'Cerrar',
      { duration: 8000 },
    );
    expect(importApi.historial).toHaveBeenCalledWith(null);
  });
});
