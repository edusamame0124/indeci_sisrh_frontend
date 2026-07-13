import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  estado: string;
  mensaje: string;
  data: T;
}

export interface SolicitudRrhh {
  id: number;
  empleadoId: number;
  empleado: string;
  tipoSolicitudId: number;
  tipoSolicitud: string;
  estadoSolicitudId: number;
  estadoSolicitud: string;
  fechaInicio: string;
  fechaFin: string;
  cantidadDias: number | null;
  motivo?: string | null;
  observacion?: string | null;
  aprobadoPor?: string | null;
  aprobadoPorNombre?: string | null;
  fechaAprobacion?: string | null;
  archivoSustento?: string | null;
  activo?: number;
  horaInicio: string | null;
  horaFin: string | null;
  cantidadHoras: number | null;
  /** Papeleta de Teletrabajo (Ley N° 31572): actividades del día. */
  detallesTeletrabajo?: DetalleTeletrabajo[] | null;
}

/** Papeleta de Teletrabajo (Ley N° 31572): actividad del día (respuesta). */
export interface DetalleTeletrabajo {
  nroOrden?: number | null;
  actividad: string;
  medioVerificacion?: string | null;
  evidenciaArchivo?: string | null;
}

export interface DocumentoSolicitud {
  id: number;
  solicitudId: number;
  etapa: string;
  nombreArchivo: string;
  rutaArchivo: string;
  versionDoc: number;
  observacion: string | null;
  usuarioUpload: string;
  createdAt: string;
}

export interface TipoSolicitudRrhh {
  id: number;
  nombre: string;
  codigo?: string;
  activo?: number;
  mostrarHoras?: number;
  requiereSustento?: number;
  requiereLugar?: number;
  requiereObservacion?: number;
  mostrarLactancia?: number;
  mostrarLicencia?: number;
  mostrarDescansoMedico?: number;
  mostrarVacacion?: number;
  mostrarCompensacion?: number;
}

export interface TipoLicencia {
  id: number;
  nombre: string;
  activo?: number;
  /** Código estable del subtipo (p. ej. LIC_CG_MAT, LIC_SIN_OTR). */
  codigo?: string;
  /** SPEC_VACACIONES F9.1 — 1 = licencia sin goce de haber. */
  esSinGoce?: number;
  /** 1 = requiere N° de Resolución Directoral de sustento. */
  requiereResolucion?: number;
  /** Código Tabla 21 PLAME (SUNAT). */
  codPlameSunat?: string;
  /** SPEC_VACACIONES F9.2 — tope de días permitido (null = sin tope). */
  maxDias?: number | null;
}

export interface TipoVacacion {
  id: number;
  nombre: string;
  codigo?: string;
  activo?: number;
}

/** Espejo de `SaldoProporcionalDto` (backend) — tope del Adelanto de Vacaciones. */
export interface SaldoProporcional {
  mesesEfectivos: number;
  saldoProporcional: number;
  diasAdelantados: number;
  saldoDisponible: number;
}

/** Espejo de `SaldoVacacionalDto` (backend) — Obtenidos/Gozados/Saldo, visible en toda papeleta. */
export interface SaldoVacacional {
  diasGanados: number;
  diasGozados: number;
  saldo: number;
}

export interface TipoDescansoMedico {
  id: number;
  nombre: string;
  activo?: number;
}

export interface DocumentoRequeridoDescansoMedico {
  id?: number;
  documentoRequeridoId?: number;
  nombre: string;
  descripcion?: string | null;
  obligatorio?: number | boolean;
  activo?: number;
}

export interface DocumentoAdjuntoRequest {
  documentoRequeridoId: number;
}

export interface DetalleVacacionRequest {
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  totalDias: number;
  /** Hub Vacacional — id del período origen elegido del dropdown (solo en detalles "_ACTUAL"). */
  vacacionOrigenId?: number | null;
}

/** Hub Vacacional — espejo de `PeriodoProgramadoDto` (backend). Dropdown Poka-Yoke. */
export interface PeriodoProgramado {
  id: number;
  periodoDesde: string;
  periodoHasta: string;
  dias: number;
  tipoGoce: string | null;
}

export interface DetalleCompensacionRequest {
  fechaCompensacion: string;
  horaInicio: string;
  horaFin: string;
  cantidadHoras: number;
}

/** Papeleta de Teletrabajo (Ley N° 31572): actividad del día. */
export interface DetalleTeletrabajoRequest {
  nroOrden?: number | null;
  actividad: string;
  medioVerificacion?: string | null;
  evidenciaArchivo?: string | null;
}

export interface CrearSolicitudRrhhRequest {
  tipoSolicitudId: number;
  fechaInicio: string;
  fechaFin: string;
  cantidadDias?: number | null;
  motivo?: string | null;
  observacion?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  cantidadHoras?: number | null;
  lugarComision?: string | null;

  fechaNacimientoHijo?: string | null;
  fechaFinPostnatal?: string | null;
  minutosIngreso?: number | null;
  minutosSalida?: number | null;

  tipoLicenciaId?: number | null;
  documento1?: string | null;
  documento2?: string | null;
  totalFolios?: number | null;

  tipoDescansoMedicoId?: number | null;
  nombreMedico?: string | null;
  numeroColegiatura?: string | null;
  documentosAdjuntos?: DocumentoAdjuntoRequest[] | null;

  tipoVacacionId?: number | null;
  detallesVacacion?: DetalleVacacionRequest[] | null;

  detallesCompensacion?: DetalleCompensacionRequest[] | null;

  /** Papeleta de Teletrabajo (Ley N° 31572): actividades del día. */
  detallesTeletrabajo?: DetalleTeletrabajoRequest[] | null;
  /** Papeleta de Teletrabajo: modalidad elegida (PARCIAL/COMPLETA). */
  modalidadTeletrabajo?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class SolicitudesRrhhService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listarMisSolicitudes(): Observable<ApiResponse<SolicitudRrhh[]>> {
    return this.http.get<ApiResponse<SolicitudRrhh[]>>(
      `${this.apiUrl}/rrhh/solicitudes/mis-solicitudes`,
    );
  }

  /** Art. 35 — feriados del año (ISO yyyy-MM-dd) para el cómputo de días hábiles en la UI. */
  obtenerFeriados(anio: number): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(
      `${this.apiUrl}/rrhh/vacaciones/feriados?anio=${anio}`,
    );
  }

  /**
   * Gate de Modalidad de Teletrabajo (Ley N° 31572): indica si el empleado
   * logueado tiene resolución de teletrabajo activa en su legajo. Alimenta el
   * bloqueo Poka-Yoke del botón "Reporte Teletrabajo".
   */
  obtenerMiTeletrabajo(): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(
      `${this.apiUrl}/rrhh/solicitudes/mi-teletrabajo`,
    );
  }

  listarTiposSolicitud(): Observable<ApiResponse<TipoSolicitudRrhh[]>> {
    return this.http.get<ApiResponse<TipoSolicitudRrhh[]>>(
      `${this.apiUrl}/catalogos/tipos-solicitud-rrhh`,
    );
  }

  listarTiposLicencia(): Observable<ApiResponse<TipoLicencia[]>> {
    return this.http.get<ApiResponse<TipoLicencia[]>>(`${this.apiUrl}/catalogos/tipos-licencia`);
  }

  listarTiposVacacion(): Observable<ApiResponse<TipoVacacion[]>> {
    return this.http.get<ApiResponse<TipoVacacion[]>>(`${this.apiUrl}/catalogos/tipos-vacacion`);
  }

  /**
   * Saldo proporcional del solicitante para el Adelanto de Vacaciones
   * (Art. 10 D.S. 013-2019-PCM). Espeja el candado del backend en el modal.
   */
  obtenerMiSaldoProporcional(): Observable<ApiResponse<SaldoProporcional>> {
    return this.http.get<ApiResponse<SaldoProporcional>>(
      `${this.apiUrl}/rrhh/vacaciones/mi-saldo-proporcional`,
    );
  }

  /**
   * Saldo vacacional (Obtenidos/Gozados/Saldo) del solicitante — visible SIEMPRE en la
   * papeleta, para cualquier tipo (Programación/Adelanto/Fraccionamiento), a pedido de RR.HH.
   */
  obtenerMiSaldo(): Observable<ApiResponse<SaldoVacacional>> {
    return this.http.get<ApiResponse<SaldoVacacional>>(`${this.apiUrl}/rrhh/vacaciones/saldo`);
  }

  /**
   * Hub Vacacional — períodos aprobados aún no gozados, disponibles para reprogramar o
   * fraccionar. Fuente del dropdown Poka-Yoke (reemplaza el ingreso manual de fechas).
   */
  obtenerPeriodosProgramados(): Observable<ApiResponse<PeriodoProgramado[]>> {
    return this.http.get<ApiResponse<PeriodoProgramado[]>>(
      `${this.apiUrl}/rrhh/vacaciones/periodos-programados`,
    );
  }

  listarTiposDescansoMedico(): Observable<ApiResponse<TipoDescansoMedico[]>> {
    return this.http.get<ApiResponse<TipoDescansoMedico[]>>(
      `${this.apiUrl}/catalogos/tipos-descanso-medico`,
    );
  }

  listarDocumentosDescansoMedico(
    tipoDescansoMedicoId: number,
  ): Observable<ApiResponse<DocumentoRequeridoDescansoMedico[]>> {
    return this.http.get<ApiResponse<DocumentoRequeridoDescansoMedico[]>>(
      `${this.apiUrl}/catalogos/tipo-descanso/${tipoDescansoMedicoId}/documentos`,
    );
  }

  crearSolicitud(
    payload: CrearSolicitudRrhhRequest,
    sustento?: File | null,
  ): Observable<ApiResponse<SolicitudRrhh>> {
    const formData = new FormData();

    formData.append(
      'datos',
      new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      }),
    );

    if (sustento) {
      formData.append('sustento', sustento);
    }

    return this.http.post<ApiResponse<SolicitudRrhh>>(
      `${this.apiUrl}/rrhh/solicitudes/registrar`,
      formData,
    );
  }

  crearSolicitudConDocumentos(
    payload: CrearSolicitudRrhhRequest,
    documentos: File[],
  ): Observable<ApiResponse<SolicitudRrhh>> {
    const formData = new FormData();

    formData.append(
      'datos',
      new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      }),
    );

    documentos.forEach((file) => {
      formData.append('documentos', file, file.name);
    });

    return this.http.post<ApiResponse<SolicitudRrhh>>(
      `${this.apiUrl}/rrhh/solicitudes/registrar`,
      formData,
    );
  }

  listarTodasSolicitudes(): Observable<ApiResponse<SolicitudRrhh[]>> {
    return this.http.get<ApiResponse<SolicitudRrhh[]>>(`${this.apiUrl}/rrhh/solicitudes/todas`);
  }

  aprobarRrhh(
    idPapeleta: number,
    file: File | null,
    observacion: string,
  ): Observable<ApiResponse<unknown>> {
    const formData = new FormData();

    if (file) {
      formData.append('file', file);
    }

    formData.append('observacion', observacion);

    return this.http.put<ApiResponse<unknown>>(
      `${this.apiUrl}/rrhh/solicitudes/aprobar-rrhh/${idPapeleta}`,
      formData,
    );
  }

  listarSolicitudesColaboradores(): Observable<ApiResponse<SolicitudRrhh[]>> {
    return this.http.get<ApiResponse<SolicitudRrhh[]>>(
      `${this.apiUrl}/rrhh/solicitudes/mis-colaboradores`,
    );
  }

  aprobarJefe(
    idPapeleta: number,
    file: File | null,
    observacion: string,
  ): Observable<ApiResponse<unknown>> {
    const formData = new FormData();

    if (file) {
      formData.append('file', file);
    }

    formData.append('observacion', observacion ?? '');

    return this.http.put<ApiResponse<unknown>>(
      `${this.apiUrl}/rrhh/solicitudes/aprobar-jefe/${idPapeleta}`,
      formData,
    );
  }

  descargarFormatoPapeleta(idPapeleta: number): Observable<Blob> {
    // SPEC_VACACIONES F9.1-bis — endpoint real que genera el PDF oficial (Jasper) y lo stremea.
    return this.http.get(`${this.apiUrl}/rrhh/solicitudes/${idPapeleta}/papeleta/pdf`, {
      responseType: 'blob',
    });
  }

  enviarPapeletaFirmada(
    idPapeleta: number,
    file: File | null,
    observacion?: string | null,
  ): Observable<ApiResponse<unknown>> {
    const formData = new FormData();

    if (file) {
      formData.append('file', file, file.name);
    }

    formData.append('observacion', observacion?.trim() ?? '');

    return this.http.put<ApiResponse<unknown>>(
      `${this.apiUrl}/rrhh/solicitudes/enviar/${idPapeleta}`,
      formData,
    );
  }

  /**
   * Elimina (soft-delete) una papeleta propia que aún está en BORRADOR.
   * El backend valida propiedad y estado; una papeleta enviada no se puede eliminar.
   */
  eliminarBorrador(idPapeleta: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      `${this.apiUrl}/rrhh/solicitudes/eliminar/${idPapeleta}`,
    );
  }

  listarDocumentosSolicitud(idPapeleta: number): Observable<ApiResponse<DocumentoSolicitud[]>> {
    return this.http.get<ApiResponse<DocumentoSolicitud[]>>(
      `${this.apiUrl}/rrhh/solicitudes-doc/${idPapeleta}`,
    );
  }

  descargarDocumento(rutaArchivo: string): Observable<Blob> {
    const params = new HttpParams().set('rutaArchivo', rutaArchivo);

    return this.http.get(`${this.apiUrl}/rrhh/ftp/download`, {
      params,
      responseType: 'blob',
    });
  }
}
