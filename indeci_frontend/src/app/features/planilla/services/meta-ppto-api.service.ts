import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type {
  CambioEstadoMasivoResult,
  DeteccionEquivResult,
  EmpMetaAnual,
  EmpMetaAnualDto,
  EmpMetaTrazabilidad,
  MetaCatEstado,
  MetaPptoCat,
  MetaPptoCatDto,
  MetaPptoEquiv,
  MetaPptoEquivDto,
  MetaPptoLote,
  MetaPptoLoteDet,
  MetaPptoLoteDto,
  MetaPptoPage,
  MetaPptoResumen,
  MetaResolverDto,
} from '../models/meta-ppto.model';

/** V010_77 — API del módulo de Asignación Anual de Metas Presupuestales. */
@Injectable({ providedIn: 'root' })
export class MetaPptoApiService {
  private readonly http = inject(HttpClient);

  private readonly cat = '/api/rrhh/meta-ppto/catalogo';
  private readonly asig = '/api/rrhh/meta-ppto/asignaciones';
  private readonly equiv = '/api/rrhh/meta-ppto/equivalencias';
  private readonly lote = '/api/rrhh/meta-ppto/lotes';

  // ===================== CATÁLOGO =====================

  listarCatalogo(anioFiscal: number): Observable<MetaPptoCat[]> {
    return this.http
      .get<ApiResponse<MetaPptoCat[]>>(`${this.cat}/${anioFiscal}`)
      .pipe(map(extractApiData));
  }

  obtenerMeta(id: number): Observable<MetaPptoCat> {
    return this.http
      .get<ApiResponse<MetaPptoCat>>(`${this.cat}/detalle/${id}`)
      .pipe(map(extractApiData));
  }

  crearMeta(dto: MetaPptoCatDto): Observable<MetaPptoCat> {
    return this.http
      .post<ApiResponse<MetaPptoCat>>(this.cat, dto)
      .pipe(map(extractApiData));
  }

  editarMeta(id: number, dto: MetaPptoCatDto): Observable<MetaPptoCat> {
    return this.http
      .put<ApiResponse<MetaPptoCat>>(`${this.cat}/${id}`, dto)
      .pipe(map(extractApiData));
  }

  anularMeta(id: number, motivo: string): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`${this.cat}/${id}`, { body: { motivo } })
      .pipe(map(extractApiData));
  }

  importarCatalogo(anioFiscal: number, filas: MetaPptoCatDto[], sobreescribir = false): Observable<MetaPptoCat[]> {
    return this.http
      .post<ApiResponse<MetaPptoCat[]>>(`${this.cat}/importar`, { anioFiscal, filas, sobreescribir })
      .pipe(map(extractApiData));
  }

  publicarCatalogo(anioFiscal: number): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${this.cat}/publicar/${anioFiscal}`, {})
      .pipe(map(extractApiData));
  }

  // ===================== ASIGNACIONES =====================

  listarAsignacionesPorEmpleado(empleadoId: number): Observable<EmpMetaAnual[]> {
    return this.http
      .get<ApiResponse<EmpMetaAnual[]>>(`${this.asig}/empleado/${empleadoId}`)
      .pipe(map(extractApiData));
  }

  listarAsignacionesPorAnio(anioFiscal: number, estado?: string): Observable<EmpMetaAnual[]> {
    const params: Record<string, string> = {};
    if (estado) params['estado'] = estado;
    return this.http
      .get<ApiResponse<EmpMetaAnual[]>>(`${this.asig}/anio/${anioFiscal}`, { params })
      .pipe(map(extractApiData));
  }

  resumen(anioFiscal: number): Observable<MetaPptoResumen> {
    return this.http
      .get<ApiResponse<MetaPptoResumen>>(`${this.asig}/resumen/${anioFiscal}`)
      .pipe(map(extractApiData));
  }

  asignarMeta(dto: EmpMetaAnualDto): Observable<EmpMetaAnual> {
    return this.http
      .post<ApiResponse<EmpMetaAnual>>(this.asig, dto)
      .pipe(map(extractApiData));
  }

  editarAsignacion(id: number, dto: EmpMetaAnualDto): Observable<EmpMetaAnual> {
    return this.http
      .put<ApiResponse<EmpMetaAnual>>(`${this.asig}/${id}`, dto)
      .pipe(map(extractApiData));
  }

  anularAsignacion(id: number, motivo: string): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`${this.asig}/${id}`, { body: { motivo } })
      .pipe(map(extractApiData));
  }

  trazabilidad(
    anioFiscal: number,
    pagina = 0,
    tamanio = 25,
    busqueda?: string,
    estado?: string,
    centroCosto?: string,
  ): Observable<MetaPptoPage<EmpMetaTrazabilidad>> {
    const params: Record<string, string | number> = { anioFiscal, pagina, tamanio };
    if (busqueda)    params['busqueda']    = busqueda;
    if (estado)      params['estado']      = estado;
    if (centroCosto) params['centroCosto'] = centroCosto;
    return this.http
      .get<ApiResponse<MetaPptoPage<EmpMetaTrazabilidad>>>(`${this.asig}/trazabilidad`, { params })
      .pipe(map(extractApiData));
  }

  // ===================== EQUIVALENCIAS =====================

  listarEquivalencias(anioOrigen: number, anioDestino: number): Observable<MetaPptoEquiv[]> {
    return this.http
      .get<ApiResponse<MetaPptoEquiv[]>>(this.equiv, { params: { anioOrigen, anioDestino } })
      .pipe(map(extractApiData));
  }

  crearEquivalencia(dto: MetaPptoEquivDto): Observable<MetaPptoEquiv> {
    return this.http
      .post<ApiResponse<MetaPptoEquiv>>(this.equiv, dto)
      .pipe(map(extractApiData));
  }

  editarEquivalencia(id: number, dto: MetaPptoEquivDto): Observable<MetaPptoEquiv> {
    return this.http
      .put<ApiResponse<MetaPptoEquiv>>(`${this.equiv}/${id}`, dto)
      .pipe(map(extractApiData));
  }

  anularEquivalencia(id: number, motivo: string): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`${this.equiv}/${id}`, { body: { motivo } })
      .pipe(map(extractApiData));
  }

  // ===================== LOTES =====================

  listarLotes(anioDestino: number): Observable<MetaPptoLote[]> {
    return this.http
      .get<ApiResponse<MetaPptoLote[]>>(`${this.lote}/${anioDestino}`)
      .pipe(map(extractApiData));
  }

  crearLote(dto: MetaPptoLoteDto): Observable<MetaPptoLote> {
    return this.http
      .post<ApiResponse<MetaPptoLote>>(this.lote, dto)
      .pipe(map(extractApiData));
  }

  procesarLote(loteId: number): Observable<MetaPptoLote> {
    return this.http
      .post<ApiResponse<MetaPptoLote>>(`${this.lote}/${loteId}/procesar`, {})
      .pipe(map(extractApiData));
  }

  detallesLote(loteId: number): Observable<MetaPptoLoteDet[]> {
    return this.http
      .get<ApiResponse<MetaPptoLoteDet[]>>(`${this.lote}/detalle/${loteId}`)
      .pipe(map(extractApiData));
  }

  observadosLote(loteId: number): Observable<MetaPptoLoteDet[]> {
    return this.http
      .get<ApiResponse<MetaPptoLoteDet[]>>(`${this.lote}/observados/${loteId}`)
      .pipe(map(extractApiData));
  }

  resolverExcepcion(loteId: number, dto: MetaResolverDto): Observable<MetaPptoLoteDet> {
    return this.http
      .post<ApiResponse<MetaPptoLoteDet>>(`${this.lote}/${loteId}/resolver`, dto)
      .pipe(map(extractApiData));
  }

  publicarLote(loteId: number): Observable<MetaPptoLote> {
    return this.http
      .post<ApiResponse<MetaPptoLote>>(`${this.lote}/${loteId}/publicar`, {})
      .pipe(map(extractApiData));
  }

  anularLote(loteId: number, motivo: string): Observable<null> {
    return this.http
      .delete<ApiResponse<null>>(`${this.lote}/${loteId}`, { body: { motivo } })
      .pipe(map(extractApiData));
  }

  // ===================== DETECCIÓN AUTOMÁTICA DE EQUIVALENCIAS =====================

  /** B2 — POST /equivalencias/detectar-auto */
  detectarEquivalenciasAuto(anioOrigen: number, anioDestino: number): Observable<DeteccionEquivResult[]> {
    return this.http
      .post<ApiResponse<DeteccionEquivResult[]>>(`${this.equiv}/detectar-auto`, { anioOrigen, anioDestino })
      .pipe(map(extractApiData));
  }

  // ===================== CAMBIO DE ESTADO MASIVO =====================

  cambiarEstadoMasivo(
    ids: number[],
    nuevoEstado: MetaCatEstado,
    motivo?: string,
  ): Observable<CambioEstadoMasivoResult> {
    return this.http
      .patch<ApiResponse<CambioEstadoMasivoResult>>(`${this.cat}/estado`, { ids, nuevoEstado, motivo })
      .pipe(map(extractApiData));
  }
}
