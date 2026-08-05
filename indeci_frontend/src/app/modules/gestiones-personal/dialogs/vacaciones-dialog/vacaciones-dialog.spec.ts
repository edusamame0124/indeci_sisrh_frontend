import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { VacacionesDialog } from './vacaciones-dialog';
import { TipoVacacion } from '../../services/solicitudes-rrhh';

describe('VacacionesDialog', () => {
  let component: VacacionesDialog;
  let fixture: ComponentFixture<VacacionesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VacacionesDialog],
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

    fixture = TestBed.createComponent(VacacionesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Adelanto de Vacaciones — gate por saldo (Art. 4 D.Leg. 1405)', () => {
    const tipoAdelanto: TipoVacacion = { id: 2, codigo: '002', nombre: 'ADELANTO DE VACACIONES', activo: 1 } as TipoVacacion;
    const tipoProgramacion: TipoVacacion = { id: 1, codigo: '001', nombre: 'PROGRAMACION DE VACACIONES', activo: 1 } as TipoVacacion;

    it('tieneSaldoVacacional() es false sin saldo cargado o con saldo 0', () => {
      expect(component.tieneSaldoVacacional()).toBe(false);

      component.saldoVacacional.set({ diasGanados: 10, diasGozados: 10, saldo: 0 } as any);
      expect(component.tieneSaldoVacacional()).toBe(false);
    });

    it('tieneSaldoVacacional() es true cuando el empleado ya tiene saldo', () => {
      component.saldoVacacional.set({ diasGanados: 150, diasGozados: 140, saldo: 10 } as any);

      expect(component.tieneSaldoVacacional()).toBe(true);
    });

    it('opcionAdelantoDeshabilitada() solo deshabilita la opción ADELANTO, no otros tipos', () => {
      component.saldoVacacional.set({ diasGanados: 150, diasGozados: 140, saldo: 10 } as any);

      expect(component.opcionAdelantoDeshabilitada(tipoAdelanto)).toBe(true);
      expect(component.opcionAdelantoDeshabilitada(tipoProgramacion)).toBe(false);
    });

    it('opcionAdelantoDeshabilitada() no deshabilita ADELANTO cuando el saldo es 0', () => {
      component.saldoVacacional.set({ diasGanados: 5, diasGozados: 5, saldo: 0 } as any);

      expect(component.opcionAdelantoDeshabilitada(tipoAdelanto)).toBe(false);
    });
  });
});
