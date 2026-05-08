/**
 * Contrato JSON páginas Spring Data (`Page<T>`) dentro de `ApiResponse.data`.
 */
export interface SpringPageDto<T> {
  readonly content: readonly T[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly size: number;
  readonly number: number;
}
