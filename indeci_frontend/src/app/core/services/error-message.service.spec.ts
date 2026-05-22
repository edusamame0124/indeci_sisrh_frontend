import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ErrorMessageService } from './error-message.service';

describe('ErrorMessageService', () => {
  let svc: ErrorMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ErrorMessageService);
  });

  it('translates known backend messages to UI Spanish', () => {
    expect(svc.translate('Credenciales inválidas')).toBe('Usuario o contraseña incorrectos');
    expect(svc.translate('Usuario inactivo')).toContain('inactiva');
    expect(svc.translate('Código OTP inválido')).toContain('Código incorrecto');
  });

  it('traduce mensajes de negocio de conceptos de planilla (Spec 009)', () => {
    expect(svc.translate('Concepto de planilla no encontrado')).toContain('No encontramos');
    expect(svc.translate('Ya existe un concepto de planilla activo con ese código')).toContain(
      'Ya existe',
    );
  });

  it('returns generic fallback for unknown messages', () => {
    expect(svc.translate('something the backend never sends')).toBe(
      'Ocurrió un problema. Inténtelo de nuevo más tarde.',
    );
  });

  it('returns generic fallback for null/undefined/empty', () => {
    expect(svc.translate(null)).toBe('Ocurrió un problema. Inténtelo de nuevo más tarde.');
    expect(svc.translate(undefined)).toBe('Ocurrió un problema. Inténtelo de nuevo más tarde.');
    expect(svc.translate('')).toBe('Ocurrió un problema. Inténtelo de nuevo más tarde.');
  });

  it('mapea duplicados de persona (DNI y correo)', () => {
    expect(svc.translate('El DNI ya está registrado')).toContain('DNI');
    expect(svc.translate('El email ya está registrado')).toContain('correo');
  });

  it('expone mensajes de negocio en español no mapeados explícitamente', () => {
    const raw = 'El código interno ya está en uso.';
    expect(svc.translate(raw)).toBe(raw);
  });

  it('isMapped distinguishes mapped vs unmapped', () => {
    expect(svc.isMapped('Credenciales inválidas')).toBe(true);
    expect(svc.isMapped('not in map')).toBe(false);
    expect(svc.isMapped(null)).toBe(false);
  });

  it('catalogosEscrituraNoDisponible es mensaje claro sin códigos HTTP', () => {
    const ui = svc.catalogosEscrituraNoDisponible();
    expect(ui.length).toBeGreaterThan(20);
    expect(ui).not.toMatch(/\b(404|405|501|HTTP)\b/i);
  });

  it('NEVER returns a message containing technical jargon (HTTP codes, exception names) — FR-038', () => {
    const allMessages = [
      'Credenciales inválidas',
      'Demasiados intentos, intenta luego',
      'Captcha inválido',
      'Usuario inactivo',
      'Código OTP inválido',
      'OTP no generado',
      'OTP ya está configurado',
      'Usuario ya cambió su contraseña',
      'Refresh inválido',
      'Refresh expirado',
      'Token inválido',
      'Debe validar OTP',
      'Debe cambiar contraseña',
    ];
    for (const m of allMessages) {
      const ui = svc.translate(m);
      expect(ui).not.toMatch(/\b(401|403|400|500|HttpError|Exception|null|undefined)\b/i);
    }
  });

  it('mapea mensajes específicos de pensión (Hotfix Spec 009)', () => {
    expect(svc.translate('Régimen pensionario no encontrado')).toContain('régimen');
    expect(svc.translate('Tipo de comisión AFP no encontrado')).toContain('comisión');
    expect(svc.translate('CUSPP inválido')).toContain('12 dígitos');
    expect(svc.translate('El CUSPP es obligatorio para AFP')).toContain('AFP');
    expect(svc.translate('Pensión no encontrada')).toContain('pensión');
    expect(svc.translate('Ya existe una pensión activa')).toContain('pensión activa');
  });

  it('pensionFormatoLegacy() sugiere recargar la página sin jargon técnico', () => {
    const ui = svc.pensionFormatoLegacy();
    expect(ui).toContain('Actualice la página');
    expect(ui).not.toMatch(/\b(400|HTTP|DTO|JSON|payload)\b/i);
  });

  it('mapea PREREQUISITE_MISSING y mensajes granulares de flujo obligatorio (Spec 009 / T142)', () => {
    const generico = svc.translate('PREREQUISITE_MISSING');
    expect(generico).toContain('Faltan datos previos');
    expect(generico).not.toMatch(/PREREQUISITE/i);

    const puesto = svc.translate('Empleado sin puesto registrado');
    expect(puesto).toContain('Puesto laboral');

    const banco = svc.translate('Empleado sin cuenta bancaria registrada');
    expect(banco).toContain('Cuenta bancaria');

    const pension = svc.translate('Empleado sin pensión registrada');
    expect(pension).toContain('pensión');

    const planilla = svc.translate('Empleado sin planilla registrada');
    expect(planilla).toContain('planilla');

    const conceptos = svc.translate('Empleado sin conceptos asignados');
    expect(conceptos).toContain('conceptos');
  });

  it('mapea mensajes específicos del Módulo Planilla en es-PE (Spec 009 / T159)', () => {
    const noEncontrado = svc.translate('Periodo no encontrado');
    expect(noEncontrado).toContain('periodo');
    expect(noEncontrado).not.toMatch(/\b(400|404|HTTP)\b/i);

    const duplicado = svc.translate('Ya existe un periodo activo con esa clave');
    expect(duplicado).toContain('YYYY-MM');

    const cerrado = svc.translate('Periodo cerrado');
    expect(cerrado).toContain('Reábrelo');

    const yaCerrado = svc.translate('Periodo ya cerrado');
    expect(yaCerrado).toContain('cerrado');

    const yaAbierto = svc.translate('Periodo ya abierto');
    expect(yaAbierto).toContain('abierto');

    const pendientes = svc.translate('Movimientos pendientes impiden cerrar el periodo');
    expect(pendientes).toContain('PENDIENTE');
    expect(pendientes).toContain('Movimientos');

    const movNoEnc = svc.translate('Movimiento no encontrado');
    expect(movNoEnc).toContain('planilla');

    const estadoInv = svc.translate('Estado de movimiento inválido');
    expect(estadoInv).toContain('PROCESADO');

    const fechas = svc.translate('Fechas de periodo inválidas');
    expect(fechas).toContain('fecha de fin');

    const formato = svc.translate('Formato de periodo inválido');
    expect(formato).toContain('YYYY-MM');

    const planillaDup = svc.translate('Planilla ya generada');
    expect(planillaDup).toContain('planilla generada');

    const sinDatos = svc.translate('Empleado sin datos para generar planilla');
    expect(sinDatos).toContain('prerequisito');
  });
});
