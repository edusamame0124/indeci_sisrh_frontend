/** Cuerpo POST — espejo de `EmpleadoPuestoDto`. */
export interface EmpleadoPuestoInput {
  readonly empleadoId: number;
  readonly cargo: string;
  readonly nivelId?: number;
  readonly sedeId?: number;
  readonly oficinaId?: number;
  readonly jefeId?: number;
  // ===== Spec 009 / T135 — catálogos organizacionales =====
  readonly dependenciaId?: number;
  readonly estructuraOrganicaId?: number;
}

/** Fila listado — espejo de `EmpleadoPuestoResponseDto`. */
export interface EmpleadoPuestoRow {
  readonly id: number;
  readonly cargo: string;
  readonly nivelId: number | null;
  readonly sedeId: number | null;
  readonly oficinaId: number | null;
  readonly jefeId: number | null;
  readonly activo: number;
  // ===== Spec 009 / T135 — IDs + display names (response denormalizado) =====
  readonly dependenciaId?: number | null;
  readonly estructuraOrganicaId?: number | null;
  readonly nivel?: string | null;
  readonly sede?: string | null;
  readonly oficina?: string | null;
  readonly dependencia?: string | null;
  readonly estructuraOrganica?: string | null;
  readonly jefe?: string | null;
  /** F5.1 — fecha de inicio del puesto (ISO YYYY-MM-DD). */
  readonly fechaInicio?: string | null;
  /** F5.1 — fecha de fin; null cuando el puesto es el vigente. */
  readonly fechaFin?: string | null;
}
