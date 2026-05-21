/**
 * Mirrors `RegimenPensionario` (Java entity).
 *
 * El campo `tipo` distingue AFP / ONP y se usa en el form de Pensión
 * (Hotfix Parte A — Spec 009) para derivar `tipoRegimen` automáticamente
 * y aplicar validadores condicionales (CUSPP, tipo de comisión).
 */
export interface RegimenPensionario {
  readonly id: number;
  readonly nombre: string;
  readonly codigo: string;
  readonly tipo: string;
  readonly activo: number;
}
