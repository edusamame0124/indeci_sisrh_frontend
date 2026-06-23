export interface LegajoResumen {
  persona?: PersonaLegajo;
  empleado?: EmpleadoLegajo;

  fotoPerfil?: string | null;

  formacionAcademica?: FormacionAcademica[];
  capacitaciones?: Capacitacion[];
  idiomas?: Idioma[];
  conocimientosInformaticos?: ConocimientoInformatico[];
  familiares?: Familiar[];
  experienciaLaboralExterna?: ExperienciaLaboral[];
  reconocimientos?: Reconocimiento[];
  medidasDisciplinarias?: MedidaDisciplinaria[];
  documentos?: LegajoDocumento[];

  personaId?: number;
  empleadoId?: number;
}

export interface PersonaLegajo {
  id?: number;
  personaId?: number;
  empleadoId?: number;

  dni?: string;
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;

  fechaNacimiento?: string;
  telefono?: string;
  email?: string | null;
  correoInstitucional?: string | null;

  direccion?: string;

  foto?: string | null;
  fotoPerfil?: string | null;

  [key: string]: any;
}

export interface EmpleadoLegajo {
  id?: number;
  empleadoId?: number;
  personaId?: number;

  codigoInterno?: string;
  codigoSisper?: string;
  estado?: string;

  conadisCodigo?: string;
  hasEps?: number;
  dniReemplazado?: string;
  registroAirhsp?: string;
  airhspMonto?: number;

  tipoPersonalId?: number;
  profesionId?: number;
  gradoAcademicoId?: number;

  [key: string]: any;
}

export interface FormacionAcademica {
  id?: number;
  empleadoId: number;

  nivelInstruccionId?: number;
  gradoAcademicoId?: number;

  institucion?: string;
  carrera?: string;

  fechaInicio?: string;
  fechaFin?: string;

  egresado?: number | boolean;
  bachiller?: number | boolean;
  titulado?: number | boolean;

  nroTitulo?: string;
  legajoDocumentoId?: number | null;
}

export interface Capacitacion {
  id?: number;
  empleadoId: number;

  nombreCurso: string;
  institucion: string;
  horas: number;

  fechaInicio: string;
  fechaFin: string;

  certificado: number;
  legajoDocumentoId?: number | null;
}

export interface Idioma {
  id?: number;
  empleadoId: number;

  idioma: string;
  nivelLectura: string;
  nivelEscritura: string;
  nivelHabla: string;

  certificado: number;
  legajoDocumentoId?: number | null;
}

export interface ConocimientoInformatico {
  id?: number;
  empleadoId: number;

  herramienta: string;
  nivel: string;

  certificado: number;
  legajoDocumentoId?: number | null;
}

export interface Familiar {
  id?: number;
  empleadoId: number;

  nombreCompleto: string;
  parentesco: string;
  fechaNacimiento?: string;

  tipoDocumentoId?: number;
  nroDocumento?: string;
  telefono?: string;
}

export interface ExperienciaLaboral {
  id?: number;
  empleadoId: number;

  empresa: string;
  cargo: string;

  fechaInicio: string;
  fechaFin?: string;

  funciones?: string;
  legajoDocumentoId?: number | null;
}

export interface Reconocimiento {
  id?: number;
  empleadoId: number;

  tipoReconocimiento: string;
  descripcion: string;

  fechaReconocimiento: string;
  legajoDocumentoId?: number | null;
}

export interface MedidaDisciplinaria {
  id?: number;
  empleadoId: number;

  tipoMedida: string;
  descripcion: string;

  fechaInicio: string;
  fechaFin?: string;

  legajoDocumentoId?: number | null;
}

export interface LegajoDocumento {
  id: number;
  empleadoId: number;

  categoriaId?: number;
  subcategoriaId?: number;

  nombreDocumento?: string;
  nombreArchivo?: string;

  fechaDocumento?: string;
  observacion?: string;
  origen?: string;
  referenciaId?: number;

  rutaArchivo?: string;
  createdAt?: string;
  activo?: number;
}
export interface TrabajadorLegajoItem {
  empleadoId: number;
  personaId: number;

  dni?: string;
  nombreCompleto?: string;
  nombres?: string;
  apellidos?: string;

  codigoInterno?: string;
  codigoSisper?: string;
  estado?: string;

  tipoPersonal?: string;
  dependencia?: string;

  [key: string]: any;
}
export interface PersonaResumenItem {
  id: number; // personaId
  empleadoId: number | null;

  nombreCompleto: string;
  dni: string;

  codigoInterno?: string | null;
  estado?: string | null;
  regimenLaboral?: string | null;
}

export interface PersonaResumenPage {
  content: PersonaResumenItem[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}
export interface CategoriaLegajo {
  id?: number;
  categoriaId?: number;
  nombre?: string;
  ordenVisual?: number;
  activo?: number;
  [key: string]: any;
}

export interface SubcategoriaLegajo {
  id?: number;
  categoriaId?: number;
  nombre?: string;
  ordenVisual?: number;
  activo?: number;
  [key: string]: any;
}
