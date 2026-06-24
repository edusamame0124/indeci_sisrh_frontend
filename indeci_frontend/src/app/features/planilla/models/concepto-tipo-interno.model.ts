import type { ConceptoPlanillaTipoConcepto } from './concepto-planilla.model';

/**
 * Catálogo administrable "Tipo de Concepto" (taxonomía funcional SISPER).
 * Mirrors `ConceptoTipoInternoDto` (Java).
 * Fuente: SPEC_CONCEPTOS_PLANILLA §13 (ajuste 2026-06-24).
 *
 * <p>Es la clasificación funcional/operativa que conoce RR.HH. (8 valores) y es
 * <strong>muchos-a-uno</strong> hacia la clasificación de cálculo del motor
 * (`clasificacionMotor`). El backend deriva el `TIPO_CONCEPTO` del motor desde
 * esta fila; el wizard solo muestra la derivación para que RR.HH. la entienda.</p>
 */
export interface ConceptoTipoInterno {
  /** Código del catálogo (= `tipoConceptoInterno` del concepto). Ej.: `REM_FIJA`. */
  readonly codigo: string;
  /** Nombre funcional SISPER mostrado en el select. Ej.: `REMUNERACION FIJA`. */
  readonly nombre: string;
  /** Clasificación del motor derivada de esta fila (mapeo data-driven). */
  readonly clasificacionMotor: ConceptoPlanillaTipoConcepto;
  /** Orden de presentación (ascendente). */
  readonly orden: number;
}
