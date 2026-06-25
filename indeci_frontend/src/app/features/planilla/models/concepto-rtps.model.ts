/**
 * Catálogo "Tipo Concepto RTPS" / PDT 601 INDECI.
 * Mirrors `ConceptoRtpsDto` (Java). Fuente: SPEC_CONCEPTOS_PLANILLA §10 (P1).
 *
 * `esGrupo === 'S'` marca una cabecera de grupo (0100/0300/0400/0700/0900/1000/2000)
 * que NO es seleccionable; solo los ítems (`esGrupo === 'N'`) lo son.
 * `codigo` preserva los ceros a la izquierda (0703, 0704) — siempre string.
 */
export interface ConceptoRtps {
  readonly codigo: string;
  readonly descripcion: string;
  readonly grupoCodigo?: string | null;
  readonly grupoDescripcion?: string | null;
  readonly esGrupo: string;
  readonly orden?: number | null;
}
