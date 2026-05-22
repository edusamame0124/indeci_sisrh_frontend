import { describe, expect, it } from 'vitest';
import { isErrorResponse, readApiErrorMessage } from './error-response.model';

describe('error-response.model', () => {
  it('isErrorResponse acepta cuerpo RRHH sin requiereCaptcha', () => {
    const body = { status: 400, mensaje: 'El DNI ya está registrado' };
    expect(isErrorResponse(body)).toBe(true);
  });

  it('readApiErrorMessage extrae mensaje aunque falte requiereCaptcha', () => {
    expect(readApiErrorMessage({ status: 400, mensaje: 'El email ya está registrado' })).toBe(
      'El email ya está registrado',
    );
  });

  it('readApiErrorMessage devuelve null si no hay mensaje', () => {
    expect(readApiErrorMessage({ status: 400 })).toBeNull();
    expect(readApiErrorMessage(null)).toBeNull();
  });
});
