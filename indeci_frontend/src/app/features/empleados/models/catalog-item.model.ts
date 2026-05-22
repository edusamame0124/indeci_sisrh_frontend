/** Mirrors backend `Bank` catalog entity JSON. */
export interface BankCatalogItem {
  readonly id: number;
  readonly name: string;
}

/** Mirrors backend `BankAccountType` catalog entity JSON. */
export interface BankAccountTypeCatalogItem {
  readonly id: number;
  readonly name: string;
}

/** Mirrors backend `RegimenPensionario` entity. */
export interface RegimenPensionarioCatalogItem {
  readonly id: number;
  readonly nombre: string;
  readonly codigo: string;
  readonly tipo: string;
  readonly activo: number;
}

/** Mirrors backend `TipoComisionAfp` entity. */
export interface TipoComisionAfpCatalogItem {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
}
