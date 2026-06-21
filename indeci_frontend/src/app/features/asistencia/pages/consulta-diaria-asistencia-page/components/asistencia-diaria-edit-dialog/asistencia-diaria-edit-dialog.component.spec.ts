import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AsistenciaApiService } from '../../../../services/asistencia-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import {
  AsistenciaDiariaEditDialogComponent,
  type AsistenciaDiariaEditDialogData,
} from './asistencia-diaria-edit-dialog.component';
import type { AsistenciaDiariaRow } from '../../../../models/asistencia-diaria.model';

function rowBase(partial?: Partial<AsistenciaDiariaRow>): AsistenciaDiariaRow {
  return {
    detalleId: 1,
    cabeceraId: 2,
    empleadoId: 3,
    dni: '12345678',
    nombreCompleto: 'SERVIDOR PUBLICO',
    fecha: '2026-06-18',
    marcaEntrada: '08:00',
    marcaSalida: '17:00',
    tipoDia: 'FALTA',
    horasTrabajadasMin: 0,
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
    ...partial,
  };
}

describe('AsistenciaDiariaEditDialogComponent', () => {
  const api = {
    editarDia: vi.fn(() => of(rowBase())),
  };

  function setup(data: AsistenciaDiariaEditDialogData) {
    TestBed.configureTestingModule({
      imports: [AsistenciaDiariaEditDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: AsistenciaApiService, useValue: api },
        { provide: ErrorMessageService, useValue: { translate: () => 'Error' } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    const fixture = TestBed.createComponent(AsistenciaDiariaEditDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    api.editarDia.mockClear();
  });

  it('con papeleta exige radio y muestra textarea solo al no autorizar', () => {
    const fixture = setup({
      row: rowBase({
        tienePapeletaAprobada: true,
        papeletaTipo: 'Permiso personal',
        papeletaMotivo: 'Trámite',
        papeletaHoraInicio: '09:00',
        papeletaHoraFin: '12:00',
        papeletaCantidadHoras: 3,
      }),
    });
    const component = fixture.componentInstance;

    expect(component.form.invalid).toBe(true);

    component.form.controls.papeletaDecision.setValue('AUTORIZAR');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea[formcontrolname="papeletaMotivoRechazo"]'))
      .toBeNull();
    expect(component.form.valid).toBe(true);

    component.form.controls.papeletaDecision.setValue('NO_AUTORIZAR');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea[formcontrolname="papeletaMotivoRechazo"]'))
      .not.toBeNull();
    expect(component.form.invalid).toBe(true);

    component.form.controls.papeletaMotivoRechazo.setValue('Sin sustento válido');
    component.guardar();

    expect(api.editarDia).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        papeletaAutorizada: false,
        papeletaMotivoRechazo: 'Sin sustento válido',
      }),
    );
  });

  it('sin papeleta envía tipoDia en el payload', () => {
    const fixture = setup({ row: rowBase({ tipoDia: 'LABORAL' }) });
    const component = fixture.componentInstance;

    component.form.controls.tipoDia.setValue('TARDANZA');
    component.guardar();

    expect(api.editarDia).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ tipoDia: 'TARDANZA' }),
    );
  });
});
