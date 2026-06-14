/**
 * Catálogo de secciones del módulo Legajo Personal.
 * Fuente única de verdad para navegación lateral, menú principal y rutas hijas.
 */

export interface LegajoSectionConfig {
  /** Código de trazabilidad (ej. LEGAJO_SEC_DATOS_GENERALES). */
  readonly id: string;
  /** Título visible en UI y documentos. */
  readonly label: string;
  /** Segmento URL bajo /legajo/. */
  readonly route: string;
  /** Nombre del ícono Material Symbols. */
  readonly icon: string;
  /** Microcopy descriptivo (futuro). */
  readonly description?: string;
}

export const LEGAJO_SECTIONS: readonly LegajoSectionConfig[] = [
  {
    id: 'LEGAJO_SEC_DATOS_GENERALES',
    label: 'Datos Generales',
    route: 'datos-generales',
    icon: 'person',
    description: 'Identificación, domicilio y datos de contacto del servidor.',
  },
  {
    id: 'LEGAJO_SEC_VINCULACION_LABORAL',
    label: 'Vinculación Laboral',
    route: 'vinculacion-laboral',
    icon: 'work',
    description: 'Contrato, régimen, cargo y condición laboral vigente.',
  },
  {
    id: 'LEGAJO_SEC_FORMACION_DESARROLLO',
    label: 'Formación y Desarrollo',
    route: 'formacion-desarrollo',
    icon: 'school',
    description: 'Estudios, capacitaciones y certificaciones.',
  },
  {
    id: 'LEGAJO_SEC_TRAYECTORIA_LABORAL',
    label: 'Trayectoria Laboral',
    route: 'trayectoria-laboral',
    icon: 'work_history',
    description: 'Historial de cargos, encargaturas y movimientos.',
  },
  {
    id: 'LEGAJO_SEC_COMPENSACIONES_BENEFICIOS',
    label: 'Compensaciones y Beneficios',
    route: 'compensaciones-beneficios',
    icon: 'payments',
    description: 'Remuneración, banco, pensión y beneficios asignados.',
  },
  {
    id: 'LEGAJO_SEC_EVALUACION_CARRERA',
    label: 'Evaluación y Desarrollo de Carrera',
    route: 'evaluacion-carrera',
    icon: 'trending_up',
    description: 'Evaluaciones de desempeño y planes de carrera.',
  },
  {
    id: 'LEGAJO_SEC_DISCIPLINA_RECONOCIMIENTOS',
    label: 'Disciplina y Reconocimientos',
    route: 'disciplina-reconocimientos',
    icon: 'military_tech',
    description: 'Sanciones, felicitaciones y méritos institucionales.',
  },
  {
    id: 'LEGAJO_SEC_RELACIONES_LABORALES',
    label: 'Relaciones Laborales',
    route: 'relaciones-laborales',
    icon: 'groups',
    description: 'Sindicato, comisiones y relaciones con representantes.',
  },
  {
    id: 'LEGAJO_SEC_SEGURIDAD_SALUD_BIENESTAR',
    label: 'Seguridad, Salud y Bienestar',
    route: 'seguridad-salud-bienestar',
    icon: 'health_and_safety',
    description: 'Seguro, exámenes médicos y programas de bienestar.',
  },
  {
    id: 'LEGAJO_SEC_DESVINCULACION',
    label: 'Desvinculación',
    route: 'desvinculacion',
    icon: 'logout',
    description: 'Cese, liquidación y documentos de salida.',
  },
  {
    id: 'LEGAJO_SEC_DOCUMENTOS_COMPLEMENTARIOS',
    label: 'Documentos Complementarios',
    route: 'documentos-complementarios',
    icon: 'description',
    description: 'Anexos, sustentos y documentación digital del legajo.',
  },
] as const;

/** Ruta por defecto al ingresar a /legajo. */
export const LEGAJO_DEFAULT_SECTION_ROUTE = LEGAJO_SECTIONS[0].route;
