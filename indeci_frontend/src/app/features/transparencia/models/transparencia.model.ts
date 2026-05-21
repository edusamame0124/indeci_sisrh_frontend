/**
 * Portal de Transparencia (Spec 011 / B4 — M10, Ley 27806).
 * Espejo de los DTOs Java `Transparencia*Dto`.
 */

/** Período publicado — espejo de `TransparenciaPeriodoDto`. */
export interface TransparenciaPeriodo {
  readonly periodo: string;
  readonly estado: string;
}

/** Fila de remuneración pública — espejo de `TransparenciaRemuneracionDto`. */
export interface TransparenciaRemuneracion {
  readonly empleado: string;
  readonly regimen: string;
  readonly remuneracionBruta: number;
}
