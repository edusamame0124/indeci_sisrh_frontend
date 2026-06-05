/** Cargo de empleado (de INDECI_CARGO). */
export interface Cargo {
  readonly id: number;
  readonly tipoCargoId: number | null;
  readonly codigo: string;
  readonly nombre: string;
  readonly activo: number;
  readonly createdAt?: string;
}
