import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CompensacionDialog } from './compensacion-dialog';
import type { MiJornadaRefrigerio } from '../../services/solicitudes-rrhh';

describe('CompensacionDialog', () => {
  let component: CompensacionDialog;
  let fixture: ComponentFixture<CompensacionDialog>;
  let httpMock: HttpTestingController;

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
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /** Precarga el refrigerio de una fecha en la cache privada, sin pasar por HTTP. */
  function seedRefrigerio(fecha: string, refrigerio: MiJornadaRefrigerio): void {
    (component as any).refrigerioPorFecha.set(fecha, refrigerio);
  }

  describe('Horas efectivas — descuento del refrigerio (RR.HH. 2026-08-09)', () => {
    it('caso feliz: jornada completa 08:00-17:00 con refrigerio 13:00-14:00 da 8h efectivas (caso reportado)', () => {
      seedRefrigerio('2026-08-05', { refrigerioInicio: '13:00', refrigerioFin: '14:00' });

      const horas = component.calcularDiferenciaHoras('2026-08-05', '08:00', '17:00');

      expect(horas).toBe(8);
    });

    it('caso normativo: un permiso que cruza PARCIALMENTE el refrigerio solo descuenta la intersección (12:00-15:00, refrigerio 13:00-14:00 → 2h)', () => {
      seedRefrigerio('2026-08-05', { refrigerioInicio: '13:00', refrigerioFin: '14:00' });

      const horas = component.calcularDiferenciaHoras('2026-08-05', '12:00', '15:00');

      expect(horas).toBe(2);
    });

    it('caso borde: sin refrigerio configurado para la fecha, no descuenta nada (resta de reloj pura, no bloquea)', () => {
      seedRefrigerio('2026-08-05', { refrigerioInicio: null, refrigerioFin: null });

      const horas = component.calcularDiferenciaHoras('2026-08-05', '08:00', '17:00');

      expect(horas).toBe(9);
    });

    it('caso borde: un permiso que NO toca el refrigerio no descuenta nada', () => {
      seedRefrigerio('2026-08-05', { refrigerioInicio: '13:00', refrigerioFin: '14:00' });

      const horas = component.calcularDiferenciaHoras('2026-08-05', '08:00', '12:00');

      expect(horas).toBe(4);
    });

    it('calcularHorasPermiso() ya no bloquea una jornada completa de 8h efectivas', () => {
      component.fechaInicio = '2026-08-05';
      seedRefrigerio('2026-08-05', { refrigerioInicio: '13:00', refrigerioFin: '14:00' });
      component.horaInicio = '08:00';
      component.horaFin = '17:00';

      component.calcularHorasPermiso();

      expect(component.cantidadHoras).toBe(8);
      expect(component.error()).toBeNull();
    });

    it('guardar() envía la solicitud cuando las horas efectivas caben en la jornada (ya no bloquea por el tope removido)', () => {
      component.tipoSolicitud = { id: 13, codigo: '013', nombre: 'Permiso compensable' } as any;
      component.fechaInicio = '2026-08-05';
      seedRefrigerio('2026-08-05', { refrigerioInicio: '13:00', refrigerioFin: '14:00' });
      component.horaInicio = '08:00';
      component.horaFin = '17:00';
      component.detallesCompensacion = [
        {
          fechaCompensacion: '2026-08-06',
          horaInicio: '08:00',
          horaFin: '16:00',
          cantidadHoras: null,
          cantidadHorasTexto: '',
        },
      ];
      seedRefrigerio('2026-08-06', { refrigerioInicio: null, refrigerioFin: null });

      component.guardar();

      // Si el guardado hubiera sido bloqueado por el tope de 8h, nunca habría llegado a
      // emitir la petición HTTP — verificamos que sí sale (sin importar la respuesta).
      const req = httpMock.expectOne((r) => r.url.includes('/rrhh/solicitudes/registrar'));
      req.flush({ estado: 'OK', mensaje: 'ok', data: {} });

      expect(component.error()).toBeNull();
    });
  });
});
