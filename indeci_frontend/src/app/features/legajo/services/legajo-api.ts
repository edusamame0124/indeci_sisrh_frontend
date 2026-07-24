import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TrabajadorLegajoItem } from '../models/legajo.model';

import {
  Idioma,
  Capacitacion,
  ExperienciaLaboral,
  Familiar,
  LegajoDocumento,
  LegajoResumen,
  MedidaDisciplinaria,
  Reconocimiento,
  PersonaResumenPage,
  ConocimientoInformatico,
  FormacionAcademica,
  CategoriaLegajo,
  SubcategoriaLegajo,
} from '../models/legajo.model';

type ApiResponse<T> =
  | T
  | {
      estado?: string;
      mensaje?: string;
      data: T;
    };

@Injectable({
  providedIn: 'root',
})
export class LegajoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rrhh`;

  private readonly apiUrl = environment.apiUrl;

  obtenerResumen(personaId: number): Observable<LegajoResumen> {
    return this.http
      .get<ApiResponse<LegajoResumen>>(`${this.baseUrl}/legajo/resumen/${personaId}`)
      .pipe(map((resp) => this.unwrap(resp)));
  }
  obtenerMiLegajo(): Observable<LegajoResumen> {
    return this.http
      .get<ApiResponse<LegajoResumen>>(`${this.baseUrl}/legajo/resumen/me`)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  subirFotoPersona(personaId: number, file: File): Observable<ApiResponse<void>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<void>>(
      `${this.apiUrl}/rrhh/persona/${personaId}/foto`,
      formData,
    );
  }

  listarDocumentos(empleadoId: number): Observable<LegajoDocumento[]> {
    return this.http
      .get<ApiResponse<LegajoDocumento[]>>(`${this.baseUrl}/legajo/empleado/${empleadoId}`)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  descargarDocumento(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/legajo/${id}/download`, {
      responseType: 'blob',
    });
  }

  eliminarDocumento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/legajo/${id}`);
  }

  registrarCapacitacion(request: Capacitacion): Observable<Capacitacion> {
    return this.http
      .post<ApiResponse<Capacitacion>>(`${this.baseUrl}/capacitaciones`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  eliminarCapacitacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/capacitaciones/${id}`);
  }

  registrarExperienciaLaboral(request: ExperienciaLaboral): Observable<ExperienciaLaboral> {
    return this.http
      .post<ApiResponse<ExperienciaLaboral>>(`${this.baseUrl}/experiencias-laborales`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  eliminarExperienciaLaboral(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/experiencias-laborales/${id}`);
  }

  registrarFamiliar(request: Familiar): Observable<Familiar> {
    return this.http
      .post<ApiResponse<Familiar>>(`${this.baseUrl}/familiares`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  eliminarFamiliar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/familiares/${id}`);
  }

  registrarReconocimiento(request: Reconocimiento): Observable<Reconocimiento> {
    return this.http
      .post<ApiResponse<Reconocimiento>>(`${this.baseUrl}/reconocimientos`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  eliminarReconocimiento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/reconocimientos/${id}`);
  }

  registrarMedidaDisciplinaria(request: MedidaDisciplinaria): Observable<MedidaDisciplinaria> {
    return this.http
      .post<ApiResponse<MedidaDisciplinaria>>(`${this.baseUrl}/medidas-disciplinarias`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  eliminarMedidaDisciplinaria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/medidas-disciplinarias/${id}`);
  }

  registrarIdioma(request: Idioma): Observable<Idioma> {
    return this.http
      .post<ApiResponse<Idioma>>(`${this.baseUrl}/idiomas`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  eliminarIdioma(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/idiomas/${id}`);
  }

  registrarConocimiento(request: ConocimientoInformatico): Observable<ConocimientoInformatico> {
    return this.http
      .post<
        ApiResponse<ConocimientoInformatico>
      >(`${this.baseUrl}/conocimientos-informaticos`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }
  eliminarConocimiento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/conocimientos-informaticos/${id}`);
  }
  registrarFormacion(request: FormacionAcademica): Observable<FormacionAcademica> {
    return this.http
      .post<ApiResponse<FormacionAcademica>>(`${this.baseUrl}/formacion-academica`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  eliminarFormacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/formacion-academica/${id}`);
  }

  buscarTrabajadores(filtro: string): Observable<TrabajadorLegajoItem[]> {
    return this.http
      .get<ApiResponse<TrabajadorLegajoItem[]>>(`${this.baseUrl}/empleados/buscar`, {
        params: {
          filtro,
        },
      })
      .pipe(map((resp) => this.unwrap(resp)));
  }

  exportarLegajoPdf(personaId: number): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/rrhh/reportes/legajo/${personaId}`, null, {
      responseType: 'blob',
    });
  }
  listarCategoriasLegajo(): Observable<CategoriaLegajo[]> {
    return this.http
      .get<ApiResponse<CategoriaLegajo[]>>(`${this.baseUrl}/legajo/categorias`)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  listarSubcategoriasLegajo(categoriaId: number): Observable<SubcategoriaLegajo[]> {
    return this.http
      .get<
        ApiResponse<SubcategoriaLegajo[]>
      >(`${this.baseUrl}/legajo/categorias/${categoriaId}/subcategorias`)
      .pipe(map((resp) => this.unwrap(resp)));
  }
  buscarPersonasLegajo(q: string = '', page = 0, size = 20): Observable<PersonaResumenPage> {
    const params: Record<string, string> = {
      page: String(page),
      size: String(size),
    };

    if (q.trim()) {
      params['q'] = q.trim();
    }

    return this.http
      .get<ApiResponse<PersonaResumenPage>>(`${this.baseUrl}/persona/page`, {
        params,
      })
      .pipe(map((resp) => this.unwrap(resp)));
  }
  eliminarRegistroLegajo(tipo: string, id: number): Observable<void> {
    switch (tipo) {
      case 'FORMACION':
        return this.eliminarFormacion(id);

      case 'CAPACITACION':
        return this.eliminarCapacitacion(id);

      case 'IDIOMA':
        return this.eliminarIdioma(id);

      case 'CONOCIMIENTO':
        return this.eliminarConocimiento(id);

      case 'FAMILIAR':
        return this.eliminarFamiliar(id);

      case 'EXPERIENCIA':
        return this.eliminarExperienciaLaboral(id);

      case 'RECONOCIMIENTO':
        return this.eliminarReconocimiento(id);

      case 'MEDIDA':
        return this.eliminarMedidaDisciplinaria(id);

      case 'DOCUMENTO':
        return this.eliminarDocumento(id);

      default:
        throw new Error(`Tipo de registro no soportado: ${tipo}`);
    }
  }
  private unwrap<T>(resp: ApiResponse<T>): T {
    if (resp && typeof resp === 'object' && 'data' in resp) {
      return resp.data;
    }

    return resp as T;
  }
  subirDocumentoLegajo(request: {
    empleadoId: number;
    categoriaId: number;
    subcategoriaId?: number | null;
    nombreDocumento: string;
    fechaDocumento?: string | null;
    observacion?: string | null;
    origen: string;
    referenciaId?: number | null;
    file: File;
  }): Observable<LegajoDocumento> {
    const formData = new FormData();

    formData.append('empleadoId', String(request.empleadoId));
    formData.append('categoriaId', String(request.categoriaId));

    if (request.subcategoriaId != null) {
      formData.append('subcategoriaId', String(request.subcategoriaId));
    }

    formData.append('nombreDocumento', request.nombreDocumento);

    if (request.fechaDocumento) {
      formData.append('fechaDocumento', request.fechaDocumento);
    }

    if (request.observacion) {
      formData.append('observacion', request.observacion);
    }

    formData.append('origen', request.origen);

    if (request.referenciaId != null) {
      formData.append('referenciaId', String(request.referenciaId));
    }

    formData.append('file', request.file);

    return this.http
      .post<ApiResponse<LegajoDocumento>>(`${this.baseUrl}/legajo/upload`, formData)
      .pipe(map((resp) => this.unwrap(resp)));
  }
  obtenerDocumento(id: number): Observable<LegajoDocumento> {
    return this.http
      .get<ApiResponse<LegajoDocumento>>(`${this.apiUrl}/rrhh/legajo/${id}`)
      .pipe(map((resp) => this.unwrap(resp)));
  }
  reemplazarSustento(params: {
    tipo: string;
    registroId: number;
    empleadoId: number;
    categoriaId: number;
    subcategoriaId?: number | null;
    nombreDocumento?: string | null;
    fechaDocumento?: string | null;
    observacion?: string | null;
    file: File;
  }): Observable<LegajoDocumento> {
    const formData = new FormData();

    formData.append('empleadoId', String(params.empleadoId));
    formData.append('categoriaId', String(params.categoriaId));
    formData.append('file', params.file);

    if (params.subcategoriaId != null) {
      formData.append('subcategoriaId', String(params.subcategoriaId));
    }

    if (params.nombreDocumento) {
      formData.append('nombreDocumento', params.nombreDocumento);
    }

    if (params.fechaDocumento) {
      formData.append('fechaDocumento', params.fechaDocumento);
    }

    if (params.observacion) {
      formData.append('observacion', params.observacion);
    }

    return this.http
      .put<
        ApiResponse<LegajoDocumento>
      >(`${this.apiUrl}/rrhh/legajo/sustento/${params.tipo}/${params.registroId}`, formData)
      .pipe(map((resp) => this.unwrap(resp)));
  }
  reemplazarSustentoUsandoDocumentoActual(params: {
    tipo: string;
    registroId: number;
    empleadoId: number;
    documentoActualId: number;
    file: File;
    nombreDocumento?: string | null;
    fechaDocumento?: string | null;
    observacion?: string | null;
  }): Observable<LegajoDocumento> {
    return this.obtenerDocumento(params.documentoActualId).pipe(
      switchMap((documentoActual) => {
        const categoriaId = documentoActual.categoriaId;

        if (!categoriaId) {
          return throwError(() => new Error('No se encontró la categoría del documento actual.'));
        }

        return this.reemplazarSustento({
          tipo: params.tipo,
          registroId: params.registroId,
          empleadoId: params.empleadoId,
          categoriaId,
          subcategoriaId: documentoActual.subcategoriaId ?? null,
          nombreDocumento:
            params.nombreDocumento ||
            documentoActual.nombreDocumento ||
            documentoActual.nombreArchivo ||
            'Documento sustentatorio',
          fechaDocumento: params.fechaDocumento || documentoActual.fechaDocumento || null,
          observacion: params.observacion || documentoActual.observacion || null,
          file: params.file,
        });
      }),
    );
  }

  actualizarFormacion(id: number, request: any): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/rrhh/formacion-academica/${id}`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  actualizarCapacitacion(id: number, request: any): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/rrhh/capacitaciones/${id}`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  actualizarIdioma(id: number, request: any): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/rrhh/idiomas/${id}`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  actualizarConocimiento(id: number, request: any): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/rrhh/conocimientos-informaticos/${id}`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  actualizarFamiliar(id: number, request: any): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/rrhh/familiares/${id}`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  actualizarExperienciaLaboral(id: number, request: any): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/rrhh/experiencias-laborales/${id}`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  actualizarReconocimiento(id: number, request: any): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/rrhh/reconocimientos/${id}`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  actualizarMedidaDisciplinaria(id: number, request: any): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.apiUrl}/rrhh/medidas-disciplinarias/${id}`, request)
      .pipe(map((resp) => this.unwrap(resp)));
  }
  listarNivelesInstruccion(): Observable<any[]> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.apiUrl}/catalogos/niveles-instruccion`)
      .pipe(map((resp) => this.unwrap(resp)));
  }

  listarGradosAcademicos(): Observable<any[]> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.apiUrl}/catalogos/grados-academicos`)
      .pipe(map((resp) => this.unwrap(resp)));
  }
}
