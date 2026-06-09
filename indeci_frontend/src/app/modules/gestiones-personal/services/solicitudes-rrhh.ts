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
  motivo: string;
  observacion: string;
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
}

export interface CrearSolicitudRrhhRequest {
  tipoSolicitudId: number;
  fechaInicio: string;
  fechaFin: string;
  cantidadDias?: number | null;
  motivo: string;
  observacion: string;
  horaInicio?: string | null;
  horaFin?: string | null;
  cantidadHoras?: number | null;
  lugarComision?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class SolicitudesRrhhService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Mis solicitudes
   */
  listarMisSolicitudes(): Observable<ApiResponse<SolicitudRrhh[]>> {
    return this.http.get<ApiResponse<SolicitudRrhh[]>>(
      `${this.apiUrl}/rrhh/solicitudes/mis-solicitudes`,
    );
  }

  /**
   * Catálogo de tipos de solicitud
   */
  listarTiposSolicitud(): Observable<ApiResponse<TipoSolicitudRrhh[]>> {
    return this.http.get<ApiResponse<TipoSolicitudRrhh[]>>(
      `${this.apiUrl}/catalogos/tipos-solicitud-rrhh`,
    );
  }

  /**
   * Crear nueva solicitud
   */
  /**crearSolicitud(payload: CrearSolicitudRrhhRequest): Observable<ApiResponse<SolicitudRrhh>> {
    return this.http.post<ApiResponse<SolicitudRrhh>>(`${this.apiUrl}/rrhh/solicitudes`, payload);
  }*/
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

  /**
   * Lista solicitudes para ser aprobadas RRHH
   *
   */

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

  /**
   * Lista solicitudes para ser aprobadas por el jefe
   */

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

  /**
   * Descargar formato PDF de la papeleta
   */
  descargarFormatoPapeleta(idPapeleta: number): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/rrhh/reportes/papeleta/${idPapeleta}`, null, {
      responseType: 'blob',
    });
  }
  /**
   * Enviar papeleta firmada al jefe
   */
  enviarPapeletaFirmada(
    idPapeleta: number,
    file: File,
    observacion: string,
  ): Observable<ApiResponse<unknown>> {
    const formData = new FormData();

    formData.append('file', file);
    formData.append('observacion', observacion);

    return this.http.put<ApiResponse<unknown>>(
      `${this.apiUrl}/rrhh/solicitudes/enviar/${idPapeleta}`,
      formData,
    );
  }

  /**
   * Historial documental de una solicitud
   */
  listarDocumentosSolicitud(idPapeleta: number): Observable<ApiResponse<DocumentoSolicitud[]>> {
    return this.http.get<ApiResponse<DocumentoSolicitud[]>>(
      `${this.apiUrl}/rrhh/solicitudes-doc/${idPapeleta}`,
    );
  }

  /**
   * Descargar documento desde FTP
   */
  descargarDocumento(rutaArchivo: string): Observable<Blob> {
    const params = new HttpParams().set('rutaArchivo', rutaArchivo);

    return this.http.get(`${this.apiUrl}/rrhh/ftp/download`, {
      params,
      responseType: 'blob',
    });
  }
}
