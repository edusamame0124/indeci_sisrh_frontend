import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { AsistenciaApiService } from '../../services/asistencia-api.service';
import { AsistenciaTabService } from '../../services/asistencia-tab.service';
import { ConsultaDiariaAsistenciaPageComponent } from './consulta-diaria-asistencia-page.component';

describe('ConsultaDiariaAsistenciaPageComponent', () => {
  const api = {
    listarDiaria: vi.fn(() =>
      of({
        content: [
          {
            detalleId: 1,
            cabeceraId: 2,
            importacionId: 10,
            empleadoId: 3,
            dni: '12345678',
            nombreCompleto: 'SERVIDOR PUBLICO',
            fecha: '2026-06-18',
            marcaEntrada: '08:00',
            marcaSalida: '17:00',
            tipoDia: 'LABORAL',
            horasTrabajadasMin: 480,
            minutosSalidaAnticipada: 0,
            periodo: '2026-06',
            origen: 'IMPORT_MARCADOR',
            minutosTardanza: 0,
            observacion: null,
            marca3: null,
            marca4: null,
            horaEntradaEsperada: '08:00',
            horasExtra25Min: 0,
            horasExtra35Min: 0,
            horasExtra100Min: 0,
            horasExtraTotalMin: 0,
            tienePapeletaAprobada: false,
            papeletaTipo: null,
            papeletaMotivo: null,
            papeletaHoraInicio: null,
            papeletaHoraFin: null,
            papeletaCantidadHoras: null,
            papeletaAutorizada: null,
            papeletaMotivoRechazo: null,
            papeletaDecisionUsuario: null,
            papeletaDecisionFecha: null,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 10,
      }),
    ),
    editarDia: vi.fn(),
  };

  beforeEach(async () => {
    api.listarDiaria.mockClear();
    await TestBed.configureTestingModule({
      imports: [ConsultaDiariaAsistenciaPageComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AsistenciaApiService, useValue: api },
        {
          provide: MatDialog,
          useValue: { open: vi.fn(() => ({ afterClosed: () => of(undefined) })) },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: ErrorMessageService, useValue: { translate: () => 'Error' } },
      ],
    }).compileComponents();
  });

  it('buscar carga registros del rango', () => {
    const fixture = TestBed.createComponent(ConsultaDiariaAsistenciaPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.fechaInicioModel.set(new Date(2026, 5, 1));
    component.fechaFinModel.set(new Date(2026, 5, 18));
    component.filtroDni.set('12345678');
    component.buscar();

    expect(api.listarDiaria).toHaveBeenCalledWith(
      expect.objectContaining({
        fechaInicio: '2026-06-01',
        fechaFin: '2026-06-18',
        dni: '12345678',
      }),
    );
    expect(component.rows()).toHaveLength(1);
    expect(component.total()).toBe(1);
  });

  it('preselección desde tab service dispara búsqueda', () => {
    const tabs = TestBed.inject(AsistenciaTabService);
    tabs.preselectFecha.set('2026-06-18');
    tabs.preselectDni.set('12345678');

    const fixture = TestBed.createComponent(ConsultaDiariaAsistenciaPageComponent);
    fixture.detectChanges();

    expect(api.listarDiaria).toHaveBeenCalled();
  });
});
