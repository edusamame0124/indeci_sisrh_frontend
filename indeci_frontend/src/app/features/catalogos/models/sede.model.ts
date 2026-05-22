/** Mirrors `Sede` (Java entity). */
export interface Sede {
  readonly id: number;
  readonly nombre: string;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly activo: number;
}
