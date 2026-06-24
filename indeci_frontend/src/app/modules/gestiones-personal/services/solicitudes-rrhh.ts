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
}

export interface TipoVacacion {
  id: number;
  nombre: string;
  codigo?: string;
  activo?: number;
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
}

export interface DetalleCompensacionRequest {
  fechaCompensacion: string;
  horaInicio: string;
  horaFin: string;
  cantidadHoras: number;
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
    file: File,
    observacion: string,
  ): Observable<ApiResponse<unknown>> {
    const formData = new FormData();

    formData.append('file', file);
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
    file: File,
    observacion: string,
  ): Observable<ApiResponse<unknown>> {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('observacion', observacion);

    return this.http.put<ApiResponse<unknown>>(
      `${this.apiUrl}/rrhh/solicitudes/aprobar-jefe/${idPapeleta}`,
      formData,
    );
  }

  descargarFormatoPapeleta(idPapeleta: number): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/rrhh/reportes/papeleta/${idPapeleta}`, null, {
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
