import type { SpringPageDto } from '../../../core/models/spring-page.model';

export interface AdminUserSummary {
  readonly id: number;
  readonly username: string;
  readonly status: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  readonly assignedRoleIds: readonly number[];
  readonly deniedPermissionIds?: readonly number[];
}

export interface AdminUserCreateRequest {
  readonly username: string;
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
