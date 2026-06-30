import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../../core/models/api-response.model';
import { extractApiData } from '../../../core/http/map-api-response';
import type { UbigeoOption } from '../models/ubigeo.model';
import type {
  BankAccountTypeCatalogItem,
  BankCatalogItem,
  RegimenPensionarioCatalogItem,
  TipoComisionAfpCatalogItem,
} from '../models/catalog-item.model';
import type { Sexo } from '../../catalogos/models/sexo.model';
import type { EstadoCivil } from '../../catalogos/models/estado-civil.model';
import type { TipoDocumento } from '../../catalogos/models/tipo-documento.model';
import type { TipoPersonal } from '../../catalogos/models/tipo-personal.model';
import type { Profesion } from '../../catalogos/models/profesion.model';
import type { GradoAcademico } from '../../catalogos/models/grado-academico.model';
import type { Nivel } from '../../catalogos/models/nivel.model';
import type { Sede } from '../../catalogos/models/sede.model';
import type { Oficina } from '../../catalogos/models/oficina.model';
import type { Dependencia } from '../../catalogos/models/dependencia.model';
import type { EstructuraOrganica } from '../../catalogos/models/estructura-organica.model';
import type { RegimenLaboral } from '../../catalogos/models/regimen-laboral.model';
import type { TipoContrato } from '../../catalogos/models/tipo-contrato.model';
import type { CondicionLaboral } from '../../catalogos/models/condicion-laboral.model';
import type { ModalidadCas } from '../../catalogos/models/modalidad-cas.model';

/** Payload escritura catálogo banco/tipo (contrato reservado BKD-001). */
export interface CatalogoNombrePayload {
  readonly name: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogoApiService {
  private readonly http = inject(HttpClient);

  /** Distritos con jerarquía departamento/provincia (selector). */
  listarUbigeo(): Observable<readonly UbigeoOption[]> {
    return this.http
      .get<ApiResponse<UbigeoOption[]>>('/api/catalogos/ubigeo')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarBancos(): Observable<readonly BankCatalogItem[]> {
    return this.http
      .get<ApiResponse<BankCatalogItem[]>>('/api/catalogos/bancos')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarTiposCuenta(): Observable<readonly BankAccountTypeCatalogItem[]> {
    return this.http
      .get<ApiResponse<BankAccountTypeCatalogItem[]>>('/api/catalogos/tipos-cuenta')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  crearBanco(payload: CatalogoNombrePayload): Observable<BankCatalogItem> {
    return this.http
      .post<ApiResponse<BankCatalogItem>>('/api/catalogos/bancos', payload)
      .pipe(map((r) => extractApiData(r)));
  }

  actualizarBanco(id: number, payload: CatalogoNombrePayload): Observable<BankCatalogItem> {
    return this.http
      .put<ApiResponse<BankCatalogItem>>(`/api/catalogos/bancos/${id}`, payload)
      .pipe(map((r) => extractApiData(r)));
  }

  eliminarBanco(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`/api/catalogos/bancos/${id}`)
      .pipe(map(() => undefined));
  }

  crearTipoCuenta(payload: CatalogoNombrePayload): Observable<BankAccountTypeCatalogItem> {
    return this.http
      .post<ApiResponse<BankAccountTypeCatalogItem>>('/api/catalogos/tipos-cuenta', payload)
      .pipe(map((r) => extractApiData(r)));
  }

  actualizarTipoCuenta(
    id: number,
    payload: CatalogoNombrePayload,
  ): Observable<BankAccountTypeCatalogItem> {
    return this.http
      .put<ApiResponse<BankAccountTypeCatalogItem>>(
        `/api/catalogos/tipos-cuenta/${id}`,
        payload,
      )
      .pipe(map((r) => extractApiData(r)));
  }

  eliminarTipoCuenta(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`/api/catalogos/tipos-cuenta/${id}`)
      .pipe(map(() => undefined));
  }

  listarRegimenesPensionarios(): Observable<readonly RegimenPensionarioCatalogItem[]> {
    return this.http
      .get<ApiResponse<RegimenPensionarioCatalogItem[]>>('/api/catalogos/regimenes-pensionarios')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarTiposComisionAfp(): Observable<readonly TipoComisionAfpCatalogItem[]> {
    return this.http
      .get<ApiResponse<TipoComisionAfpCatalogItem[]>>('/api/catalogos/tipos-comision-afp')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  // ============================================================
  // Catálogos extendidos Spec 009 — 15 GETs nuevos
  // ============================================================

  listarSexos(): Observable<readonly Sexo[]> {
    return this.http
      .get<ApiResponse<Sexo[]>>('/api/catalogos/sexos')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarEstadosCiviles(): Observable<readonly EstadoCivil[]> {
    return this.http
      .get<ApiResponse<EstadoCivil[]>>('/api/catalogos/estados-civiles')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarTiposDocumento(): Observable<readonly TipoDocumento[]> {
    return this.http
      .get<ApiResponse<TipoDocumento[]>>('/api/catalogos/tipos-documento')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarTiposPersonal(): Observable<readonly TipoPersonal[]> {
    return this.http
      .get<ApiResponse<TipoPersonal[]>>('/api/catalogos/tipos-personal')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarProfesiones(): Observable<readonly Profesion[]> {
    return this.http
      .get<ApiResponse<Profesion[]>>('/api/catalogos/profesiones')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarGradosAcademicos(): Observable<readonly GradoAcademico[]> {
    return this.http
      .get<ApiResponse<GradoAcademico[]>>('/api/catalogos/grados-academicos')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarNiveles(): Observable<readonly Nivel[]> {
    return this.http
      .get<ApiResponse<Nivel[]>>('/api/catalogos/niveles')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarSedes(): Observable<readonly Sede[]> {
    return this.http
      .get<ApiResponse<Sede[]>>('/api/catalogos/sedes')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarOficinas(): Observable<readonly Oficina[]> {
    return this.http
      .get<ApiResponse<Oficina[]>>('/api/catalogos/oficinas')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarOficinasPorSede(sedeId: number): Observable<readonly Oficina[]> {
    return this.http
      .get<ApiResponse<Oficina[]>>(`/api/catalogos/oficinas/sede/${sedeId}`)
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarDependencias(): Observable<readonly Dependencia[]> {
    return this.http
      .get<ApiResponse<Dependencia[]>>('/api/catalogos/dependencias')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarEstructurasOrganicas(): Observable<readonly EstructuraOrganica[]> {
    return this.http
      .get<ApiResponse<EstructuraOrganica[]>>('/api/catalogos/estructuras-organicas')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarRegimenesLaborales(): Observable<readonly RegimenLaboral[]> {
    return this.http
      .get<ApiResponse<RegimenLaboral[]>>('/api/catalogos/regimenes-laborales')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarTiposContrato(): Observable<readonly TipoContrato[]> {
    return this.http
      .get<ApiResponse<TipoContrato[]>>('/api/catalogos/tipos-contrato')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarCondicionesLaborales(): Observable<readonly CondicionLaboral[]> {
    return this.http
      .get<ApiResponse<CondicionLaboral[]>>('/api/catalogos/condiciones-laborales')
      .pipe(map((r) => [...extractApiData(r)]));
  }

  listarModalidadesCas(): Observable<readonly ModalidadCas[]> {
    return this.http
      .get<ApiResponse<ModalidadCas[]>>('/api/catalogos/modalidades-cas')
      .pipe(map((r) => [...extractApiData(r)]));
  }
}
