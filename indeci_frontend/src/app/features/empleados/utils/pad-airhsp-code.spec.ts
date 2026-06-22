import { describe, expect, it } from 'vitest';
import { padAirhspCode, isValidAirhspCode } from './pad-airhsp-code';

describe('padAirhspCode', () => {
  it('rellena con ceros a la izquierda hasta 6 dígitos', () => {
    expect(padAirhspCode('51')).toBe('000051');
    expect(padAirhspCode('123456')).toBe('123456');
  });

  it('elimina caracteres no numéricos', () => {
    expect(padAirhspCode('12-34')).toBe('001234');
  });

  it('isValidAirhspCode valida patrón de 6 dígitos', () => {
    expect(isValidAirhspCode('000051')).toBe(true);
    expect(isValidAirhspCode('51')).toBe(false);
  });
});
