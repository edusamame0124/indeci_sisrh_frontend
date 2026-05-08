const MAX_LEN_USER_ACTION = 128;
const MAX_LEN_IP = 64;

function stripControlChars(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code >= 32 || code === 9) out += value[i];
  }
  return out;
}

export function sanitizeAuditTextFilter(value: string, maxLen: number): string {
  const t = stripControlChars(value.trim());
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

/** Filtros usuario/acción/IP para query params (mitigación cliente; backend debe validar). */
export function sanitizeAuditUsuarioFilter(value: string): string {
  return sanitizeAuditTextFilter(value, MAX_LEN_USER_ACTION);
}

export function sanitizeAuditAccionFilter(value: string): string {
  return sanitizeAuditTextFilter(value, MAX_LEN_USER_ACTION);
}

export function sanitizeAuditIpFilter(value: string): string {
  return sanitizeAuditTextFilter(value, MAX_LEN_IP);
}
