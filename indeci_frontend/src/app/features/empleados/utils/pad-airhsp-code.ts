const AIRHSP_PATTERN = /^[0-9]{6}$/;

/** Normaliza a 6 dígitos numéricos con ceros a la izquierda (ej. `51` → `000051`). */
export function padAirhspCode(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === '') {
    return '';
  }
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  return digits.padStart(6, '0');
}

export function isValidAirhspCode(code: string): boolean {
  return AIRHSP_PATTERN.test(code);
}
