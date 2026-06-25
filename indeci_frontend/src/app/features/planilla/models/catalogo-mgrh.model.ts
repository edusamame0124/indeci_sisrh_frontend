import type { SpringPageDto } from '../../../core/models/spring-page.model';

/**
 * CatÃ¡logo maestro de conceptos oficiales MGRH / MEF
 * (SPEC_HOMOLOGACION_MGRH Â§C.1 Â· Â§E).
 *
 * <p>Solo lectura: refleja el corte anual cargado por migraciÃ³n del archivo
 * `Conceptos2026.xls`. La homologaciÃ³n de un concepto local apunta a una de
 * estas filas (FK Ãºnica, nullable). El front nunca crea ni edita estas filas.</p>
 *
 * <p>Mirror de `CatalogoConceptoMgrhDto` (Java). Campos `S`/`N` (vigente) y
 * `SI`/`NO` (imponible) viajan como string para reflejar el char Oracle.</p>
 */
export interface CatalogoConceptoMgrh {
  readonly id: number;
  /** INGRESOS | APORTES | EGRESOS | GASTOS POR ENCARGO (Â§B/D1). */
  readonly tipo: string;
  /** CÃ³digo de 4 dÃ­gitos con ceros (texto, ej. `0001`). */
  readonly codigoConceptoMgrh: string;
  readonly descripcionNorma: string | null;
  readonly detalleNorma: string | null;
  /** Texto crudo del Excel; siempre conservado (Â§D2). */
  readonly fechaVigenciaTexto: string | null;
  /** Derivado nullable: solo si el texto es `dd/mm/yyyy` parseable (Â§D2). */
  readonly fechaVigenciaDate: string | null;
  /** Imponible oficial: `SI` | `NO`. */
  readonly imponible: string | null;
  readonly descripcionTipoConcepto: string | null;
  readonly tipoNorma: string | null;
  readonly estado: string | null;
  /** `true` = seleccionable en conceptos ordinarios (excluye GASTOS POR ENCARGO). */
  readonly seleccionable: boolean;
  /** VersiÃ³n anual del catÃ¡logo (ej. 2026 â€” Â§D6). */
  readonly anioCatalogo: number;
  /** `true` = versiÃ³n vigente mÃ¡s reciente para el (TIPO,CÃ“DIGO). */
  readonly vigente: boolean;
  /** Corte de origen, ej. `Conceptos2026.xls` (Â§D6). */
  readonly fuenteCatalogo: string | null;
}

/** PÃ¡gina Spring de resultados del catÃ¡logo MGRH (Â§E â€” API paginada). */
export type CatalogoConceptoMgrhPage = SpringPageDto<CatalogoConceptoMgrh>;

/**
 * Filtros del buscador del catÃ¡logo MGRH (Â§E). Todos opcionales; los vacÃ­os no
 * se envÃ­an. `soloSeleccionables`/`soloVigentes` por defecto `true` en backend.
 */
export interface CatalogoConceptoMgrhFiltro {
  readonly texto?: string | null;
  readonly tipoLocal?: string | null;
  readonly codigo?: string | null;
  readonly tipo?: string | null;
  readonly descripcion?: string | null;
  readonly detalle?: string | null;
  readonly estado?: string | null;
  readonly soloActivos?: boolean;
  readonly limit?: number;
  /** `true` (default) excluye GASTOS POR ENCARGO. */
  readonly soloSeleccionables?: boolean;
  /** `true` (default) solo `VIGENTE='S'` (versiÃ³n anual mÃ¡s reciente). */
  readonly soloVigentes?: boolean;
}
