import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CompensacionDialog } from './compensacion-dialog';

describe('CompensacionDialog', () => {
  let component: CompensacionDialog;
  let fixture: ComponentFixture<CompensacionDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompensacionDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideNativeDateAdapter(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompensacionDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Jornada máxima diaria — tope de 8 horas', () => {
    it('acepta una jornada de 8 horas exactas', () => {
      component.horaInicio = '08:30';
      component.horaFin = '16:30';

      component.calcularHorasPermiso();

      expect(component.cantidadHoras).toBe(8);
      expect(component.excedeMaximoHoras()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('rechaza una jornada de 9 horas (caso reportado: 08:30 a 17:30)', () => {
      component.horaInicio = '08:30';
      component.horaFin = '17:30';

      component.calcularHorasPermiso();

      expect(component.cantidadHoras).toBe(9);
      expect(component.excedeMaximoHoras()).toBe(true);
      expect(component.error()).toContain('no puede exceder las 8 horas');
    });

    it('guardar() bloquea el envío cuando se excede el máximo de horas', () => {
      component.tipoSolicitud = { id: 13, codigo: '013', nombre: 'Permiso compensable' } as any;
      component.fechaInicio = '2026-08-05';
      component.horaInicio = '08:30';
      component.horaFin = '17:30';

      component.guardar();

      expect(component.error()).toContain('no puede exceder las 8 horas');
    });
  });
});
