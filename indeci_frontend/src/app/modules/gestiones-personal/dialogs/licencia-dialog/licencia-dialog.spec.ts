import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { LicenciaDialog } from './licencia-dialog';

describe('LicenciaDialog', () => {
  let component: LicenciaDialog;
  let fixture: ComponentFixture<LicenciaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LicenciaDialog],
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

    fixture = TestBed.createComponent(LicenciaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('modo unificado: la modalidad SIN_GOCE define el flujo sin goce', () => {
    component.modalidadGoce = 'SIN_GOCE';
    expect(component.esFlujoSinGoce()).toBeTrue();

    component.modalidadGoce = 'CON_GOCE';
    expect(component.esFlujoSinGoce()).toBeFalse();
  });

  it('tiposFiltrados separa con goce / sin goce según la modalidad', () => {
    component.tiposLicencia.set([
      { id: 1, nombre: 'Por adopción', codigo: 'LIC_CG_ADO', esSinGoce: 0, maxDias: 30 },
      { id: 2, nombre: 'Otros motivos', codigo: 'LIC_SIN_OTR', esSinGoce: 1 },
    ]);

    component.modalidadGoce = 'CON_GOCE';
    expect(component.tiposFiltrados().map((t) => t.id)).toEqual([1]);

    component.modalidadGoce = 'SIN_GOCE';
    expect(component.tiposFiltrados().map((t) => t.id)).toEqual([2]);
  });

  it('calcularDias marca error cuando se excede el tope del motivo', () => {
    component.tiposLicencia.set([
      { id: 1, nombre: 'Por adopción', codigo: 'LIC_CG_ADO', esSinGoce: 0, maxDias: 30 },
    ]);
    component.modalidadGoce = 'CON_GOCE';
    component.tipoLicenciaId = 1;
    component.fechaInicio = '2026-01-01';
    component.fechaFin = '2026-03-01'; // > 30 días

    component.calcularDias();

    expect(component.error()).toContain('máximo permitido');
  });

  it('esMotivoOtros true solo para el subtipo sin goce "Otros motivos"', () => {
    component.tiposLicencia.set([
      { id: 2, nombre: 'Otros motivos', codigo: 'LIC_SIN_OTR', esSinGoce: 1 },
      { id: 3, nombre: 'Por causas justificadas', codigo: 'LIC_SIN_JUS', esSinGoce: 1 },
    ]);
    component.modalidadGoce = 'SIN_GOCE';

    component.tipoLicenciaId = 2;
    expect(component.esMotivoOtros()).toBeTrue();

    component.tipoLicenciaId = 3;
    expect(component.esMotivoOtros()).toBeFalse();
  });
});
