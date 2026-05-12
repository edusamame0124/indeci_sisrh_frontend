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

  it('returns generic fallback for unknown messages', () => {
    expect(svc.translate('something the backend never sends')).toBe(
      'Ocurrió un problema. Inténtalo de nuevo más tarde.',
    );
  });

  it('returns generic fallback for null/undefined/empty', () => {
    expect(svc.translate(null)).toBe('Ocurrió un problema. Inténtalo de nuevo más tarde.');
    expect(svc.translate(undefined)).toBe('Ocurrió un problema. Inténtalo de nuevo más tarde.');
    expect(svc.translate('')).toBe('Ocurrió un problema. Inténtalo de nuevo más tarde.');
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
});
