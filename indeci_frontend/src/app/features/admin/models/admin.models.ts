import type { SpringPageDto } from '../../../core/models/spring-page.model';

export interface AdminUserSummary {
  readonly id: number;
  readonly username: string;
  readonly status: string;
  readonly sistemas?: readonly AccesoSistema[];
}

export interface AdminUserDetail extends AdminUserSummary {
  readonly assignedRoleIds: readonly number[];
  readonly deniedPermissionIds?: readonly number[];
  readonly sistemas?: readonly AccesoSistema[];
}

export interface AdminUserCreateRequest {
  readonly username: string;
  readonly password: string;
}

export interface AdminUserStatusPatch {
  readonly status: 'ACTIVE' | 'INACTIVE';
}

export interface AdminUserRolesPut {
  readonly roleIds: readonly number[];
}

export interface AdminUserPermisoDeniesPut {
  readonly permisoIds: readonly number[];
}

export interface AdminUserPermisoGrantsPut {
  readonly permisoIds: readonly number[];
}

export interface PermisoGrantedRow {
  readonly permisoId: number;
  readonly codigo?: string;
  readonly nombre?: string;
}

export interface SistemaAdmin {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly icono?: string | null;
  readonly orden?: number | null;
  readonly activo?: number | null;
}

export interface SistemaRol {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly orden?: number | null;
}

export interface SistemaArea {
  readonly codigo: string;
  readonly nombre: string;
  readonly sigla?: string | null;
  readonly orden?: number | null;
}

export interface AccesoSistema {
  readonly codigo: string;
  readonly nombre: string;
  readonly activo: boolean;
  readonly roles: readonly string[];
  readonly area?: string | null;
}

export interface AccesoSistemaPutItem {
  readonly codigo: string;
  readonly activo: boolean;
  readonly roles: readonly string[];
  readonly area?: string | null;
}

export interface AccesosPutRequest {
  readonly accesos: readonly AccesoSistemaPutItem[];
}

export interface AdminRolRow {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly activo?: string;
  readonly nivel?: number | null;
}

export interface AdminPermisoRow {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
}

export interface AdminAuditoriaRow {
  readonly id: number;
  readonly usuario: string;
  readonly accion: string;
  readonly metodo: string;
  readonly ip: string;
  readonly userAgent: string;
  readonly fecha: string;
  readonly detalle: string;
  readonly estado: string;
}

export type AdminAuditoriaPage = SpringPageDto<AdminAuditoriaRow>;
export type AdminUserPage = SpringPageDto<AdminUserSummary>;
