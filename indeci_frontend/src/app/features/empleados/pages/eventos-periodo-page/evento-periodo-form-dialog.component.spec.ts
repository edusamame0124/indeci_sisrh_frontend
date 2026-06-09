import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventoPeriodoApiService } from '../../services/evento-periodo-api.service';
import { LegajoDocumentoApiService } from '../../services/legajo-documento-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import {
  EventoPeriodoFormDialogComponent,
  type EventoPeriodoDialogData,
} from './evento-periodo-form-dialog.component';

describe('EventoPeriodoFormDialogComponent', () => {
  const tipos = [
    {
      id: 1,
      codigo: 'MATERNIDAD',
      nombre: 'Subsidio por Maternidad',
      afectaDiasLaborados: 'S',
      afectaBaseAfp: 'S',
      afectaBaseEssalud: 'S',
      generaSubsidio: 'S',
      requiereAdjunto: 'S',
      permiteSolape: 'N',
      codigoPlameSunat: '0915',
      ordenVisual: 1,
      activo: 1,
    },
    {
      id: 2,
      codigo: 'PERMISO_PERSONAL',
      nombre: 'Permiso personal',
      afectaDiasLaborados: 'S',
      afectaBaseAfp: 'N',
      afectaBaseEssalud: 'N',
      generaSubsidio: 'N',
      requiereAdjunto: 'N',
      permiteSolape: 'N',
      codigoPlameSunat: null,
      ordenVisual: 2,
      activo: 1,
    },
  ] as const;

  const dialogData: EventoPeriodoDialogData = {
    empleadoId: null,
    tipos,
    categoriasLegajo: [{ id: 1, nombre: 'Subsidios', activo: 1 }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventoPeriodoFormDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: ErrorMessageService, useValue: { translate: (m: string | null) => m ?? 'Error' } },
        {
          provide: EventoPeriodoApiService,
          useValue: { crear: vi.fn(() => of({})), actualizar: vi.fn(() => of({})) },
        },
        {
          provide: LegajoDocumentoApiService,
          useValue: { upload: vi.fn(() => of({ id: 99 })) },
        },
        {
          provide: PersonaApiService,
          useValue: {
            listarPaginado: vi.fn(() =>
              of({
                content: [{ id: 1, empleadoId: 10, nombreCompleto: 'Test', dni: '12345678' }],
                totalElements: 1,
                totalPages: 1,
                pageNumber: 0,
                pageSize: 15,
              }),
            ),
          },
        },
      ],
    }).compileComponents();
  });

  it('activa modo maternidad y calcula distribucion', () => {
    const fixture = TestBed.createComponent(EventoPeriodoFormDialogComponent);
    const cmp = fixture.componentInstance;
    fixture.detectChanges();

    cmp.form.controls.tipoEventoId.setValue(1);
    cmp.form.controls.fechaInicio.setValue(new Date(2026, 4, 5));
    cmp.form.controls.duracionLegal.setValue(98);
    cmp.form.controls.fechaProbableParto.setValue(new Date(2026, 4, 20));
    fixture.detectChanges();

    expect(cmp.esMaternidad()).toBe(true);
    expect(cmp.distribucion().length).toBeGreaterThan(0);
    expect(cmp.distribucion().reduce((s, t) => s + t.diasSubsidio, 0)).toBe(98);
    expect(cmp.maternidadResumen().totalDias).toBe(98);
    expect(cmp.maternidadResumen().fechaFinTexto).toBe('06/08/2026');
  });

  it('limpia campos maternidad al cambiar a otro tipo', () => {
    const fixture = TestBed.createComponent(EventoPeriodoFormDialogComponent);
    const cmp = fixture.componentInstance;
    fixture.detectChanges();

    cmp.form.controls.tipoEventoId.setValue(1);
    cmp.form.controls.nroCitt.setValue('CITT-1');
    cmp.form.controls.duracionLegal.setValue(98);
    fixture.detectChanges();

    cmp.form.controls.tipoEventoId.setValue(2);
    fixture.detectChanges();

    expect(cmp.esMaternidad()).toBe(false);
    expect(cmp.form.controls.nroCitt.value).toBe('');
    expect(cmp.distribucion().length).toBe(0);
  });

  it('preview muestra advertencia multi-mes', () => {
    const fixture = TestBed.createComponent(EventoPeriodoFormDialogComponent);
    const cmp = fixture.componentInstance;
    fixture.detectChanges();

    cmp.form.controls.tipoEventoId.setValue(1);
    cmp.form.controls.fechaInicio.setValue(new Date(2026, 4, 5));
    cmp.form.controls.duracionLegal.setValue(98);
    cmp.previsualizarImpacto();

    expect(cmp.preview()?.cruzaMeses).toBe(true);
    expect(cmp.previewVisible()).toBe(true);
  });
});
