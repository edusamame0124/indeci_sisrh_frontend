/**
 * Fase 3 SSO — Modelo del Portal Selector.
 *
 * Una `SistemaCard` representa una card del selector. Combina:
 *   - El catálogo visual ESTÁTICO ({@link SISTEMAS_METADATA}) — nombres,
 *     descripciones e íconos que viven en el frontend para evitar una llamada
 *     extra al backend en cada login.
 *   - Los roles dinámicos del usuario en ese sistema (claim `sistemas` del JWT).
 *   - La URL externa (de `environment.sistemasExternos`) cuando aplica.
 *
 * Si un sistema externo aparece en el JWT pero no en {@link SISTEMAS_METADATA},
 * el selector lo pinta con fallback genérico — la metadata se debe actualizar
 * cuando el cliente agregue un sistema nuevo a la entidad.
 */
/**
 * Rol del usuario en un sistema, con su par {code, label}.
 *   - `code`: el valor opaco del JSON `ROLES_EXTERNOS` (lo que reciben los
 *     sistemas externos, p. ej. "JEFE_AREA").
 *   - `label`: texto amigable que muestra el chip en el selector
 *     (p. ej. "JEFE DE ÁREA"). Si no hay mapping definido, cae al code.
 */
export interface SistemaCardRole {
  readonly code: string;
  readonly label: string;
}

export interface SistemaCard {
  /** Código estable del sistema (match con catálogo backend INDECI_SISTEMA.CODIGO). */
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion: string;
  /** Nombre de ícono Material para el header de la card. */
  readonly icono: string;
  /** Orden visual en el selector (ASC). */
  readonly orden: number;
  /** Roles del usuario en ESTE sistema, ya con display label resuelto. */
  readonly roles: ReadonlyArray<SistemaCardRole>;
  /**
   * URL externa a la que redirigir. NULL para SISRH (navegación interna a
   * `returnUrl` del LoginFlow). Definida para `convocatoria` y `rendimiento`
   * desde environments.
   */
  readonly urlBase: string | null;
  /**
   * TRUE cuando el usuario NO tiene roles en este sistema: la card aparece
   * con candado y el click no hace nada.
   */
  readonly bloqueada: boolean;
}

/**
 * Metadata estática del catálogo de sistemas. Cada entrada debe matchear con
 * una fila de `GESTIONRRHH.INDECI_SISTEMA`. El campo {@code urlEnvKey}
 * apunta a la key dentro de `environment.sistemasExternos` que contiene la
 * URL del sistema (NULL para SISRH).
 */
export interface SistemaMetadata {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly icono: string;
  readonly orden: number;
  readonly urlEnvKey: string | null;
  /**
   * Display amigable por código de rol. Opcional: solo declarar las entradas
   * que necesitan transformar (ej. {@code JEFE_AREA → "JEFE DE ÁREA"}). Los
   * códigos sin mapping se muestran tal cual en el chip.
   */
  readonly rolesDisplay?: Readonly<Record<string, string>>;
}

export const SISTEMAS_METADATA: ReadonlyArray<SistemaMetadata> = [
  {
    codigo: 'sisrh',
    nombre: 'SISRH',
    descripcion: 'Sistema integrador de RRHH y planillas',
    icono: 'badge',
    orden: 1,
    urlEnvKey: null,
    // Roles macro del SISRH (verificados contra core/config/sisrh-roles.config.ts).
    // Los códigos con sufijo legacy se mapean a su display real para no exponerlos crudos.
    rolesDisplay: {
      SUPER_ADMIN: 'Super Administrador',
      ADMIN_TI: 'Administrador TI',
      ADMIN: 'Administrador',
      RRHH_JEFE: 'Jefe RRHH',
      RRHH_ANALISTA: 'Analista RRHH',
      PLANILLA_ANALISTA: 'Analista de Planilla',
      PLANILLA_APROBADOR: 'Aprobador de Planilla',
      RRHH_CONSULTA: 'Consulta RRHH',
      RRHH_ADMIN: 'Administrador RRHH',
    },
  },
  {
    codigo: 'convocatoria',
    nombre: 'Convocatoria',
    descripcion: 'Gestión de procesos de selección CAS',
    icono: 'assignment_ind',
    orden: 2,
    urlEnvKey: 'convocatoria',
    // Códigos del JWT contrato Login SISCONV — CON prefijo ROLE_.
    // Etiquetas funcionales según documento del cliente.
    rolesDisplay: {
      ROLE_ADMIN: 'Administrador',
      ROLE_ORH: 'ORH',
      ROLE_OPP: 'OPP',
      ROLE_AREA_SOLICITANTE: 'Área Solicitante',
      ROLE_COMITE: 'Comité de Selección',
      ROLE_POSTULANTE: 'Postulante',
    },
  },
  {
    codigo: 'rendimiento',
    nombre: 'Rendimiento',
    descripcion: 'Gestión y evaluación del desempeño',
    icono: 'insights',
    orden: 3,
    urlEnvKey: 'rendimiento',
    // Códigos del JWT contrato GDR Access (SDD §7.1) — SIN prefijo ROLE_.
    // Etiquetas según matriz Rol → Actor del documento del cliente.
    rolesDisplay: {
      ADMIN_SISTEMA: 'Admin Sistema',
      GDR_ORH: 'ORH',
      GDR_JUNTA_DIRECTIVOS: 'Junta de Directivos',
      GDR_USUARIO: 'Usuario GDR',
      GDR_CONSULTA: 'Consulta',
      GDR_CIE: 'CIE',
      GDR_TITULAR: 'Titular',
      GDR_AUDITOR: 'Auditor',
    },
  },
] as const;
