import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { PermisoComunDialog } from './permiso-comun-dialog';
import { SolicitudesRrhhService } from '../../services/solicitudes-rrhh';

describe('PermisoComunDialog', () => {
  let component: PermisoComunDialog;
  let fixture: ComponentFixture<PermisoComunDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermisoComunDialog],
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

    fixture = TestBed.createComponent(PermisoComunDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('PermisoComunDialog — Omisión de Registro de Asistencia (código 004)', () => {
  let component: PermisoComunDialog;
  let fixture: ComponentFixture<PermisoComunDialog>;
  let service: SolicitudesRrhhService;

  const tipoSolicitudOmision = { id: 4, codigo: '004', nombre: 'Permiso de Justificación de Omisión de Registro de Asistencia' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermisoComunDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideNativeDateAdapter(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { tipoSolicitud: tipoSolicitudOmision } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermisoComunDialog);
    component = fixture.componentInstance;
    service = TestBed.inject(SolicitudesRrhhService);
    await fixture.whenStable();
  });

  it('reconoce el código 004 como Omisión de Registro de Asistencia', () => {
    expect(component.esOmision()).toBe(true);
  });

  it('exige seleccionar Tipo (Ingreso/Salida) antes de guardar', () => {
    component.fechaInicio = '2026-08-05';

    component.guardar();

    expect(component.error()).toBe('Seleccione si la omisión fue de Ingreso o de Salida.');
  });

  it('exige la hora una vez elegido el tipo', () => {
    component.fechaInicio = '2026-08-05';
    component.tipoOmision = 'INGRESO';

    component.guardar();

    expect(component.error()).toBe('Ingrese la hora de ingreso.');
  });

  it('al elegir Ingreso, envía la hora en horaFin y deja horaInicio en null (sin cantidad de horas)', () => {
    const spy = vi.spyOn(service, 'crearSolicitud').mockReturnValue(of({ data: {} } as any));

    component.fechaInicio = '2026-08-05';
    component.tipoOmision = 'INGRESO';
    component.horaOmision = '08:15';

    component.guardar();

    const payload = spy.mock.lastCall?.[0];
    expect(payload?.horaFin).toBe('08:15');
    expect(payload?.horaInicio).toBeNull();
    expect(payload?.cantidadHoras).toBeNull();
  });

  it('al elegir Salida, envía la hora en horaInicio y deja horaFin en null', () => {
    const spy = vi.spyOn(service, 'crearSolicitud').mockReturnValue(of({ data: {} } as any));

    component.fechaInicio = '2026-08-05';
    component.tipoOmision = 'SALIDA';
    component.horaOmision = '17:40';

    component.guardar();

    const payload = spy.mock.lastCall?.[0];
    expect(payload?.horaInicio).toBe('17:40');
    expect(payload?.horaFin).toBeNull();
    expect(payload?.cantidadHoras).toBeNull();
  });
});
