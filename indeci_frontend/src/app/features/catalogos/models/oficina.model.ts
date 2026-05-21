/** Mirrors `Oficina` (Java entity). */
export interface Oficina {
  readonly id: number;
  readonly sedeId: number;
  readonly nombre: string;
  readonly sigla: string | null;
  readonly activo: number;
}
