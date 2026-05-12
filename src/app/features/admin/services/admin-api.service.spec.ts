import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminApiService } from './admin-api.service';
import type { AdminUserDetail, AdminUserPage } from '../models/admin.models';

describe('AdminApiService', () => {
  let service: AdminApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listUsersPaged usa GET ApiResponse página', () => {
    let out: AdminUserPage | undefined;
    const payload: AdminUserPage = {
      content: [{ id: 1, username: 'j', status: 'ACTIVE' }],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0,
    };

    service.listUsersPaged(0, 10, ' jd ').subscribe((p) => {
      out = p;
    });

    const req = httpMock.expectOne(
      (r) => r.url === '/api/admin/users' && r.params.get('page') === '0' && r.params.get('size') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'OK', data: payload });

    expect(out).toEqual(payload);
  });

  it('resetUserPassword POST vacío sin revelar secreto cliente', () => {
    service.resetUserPassword(7).subscribe();
    const req = httpMock.expectOne('/api/admin/users/7/reset-password');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ estado: 'OK', mensaje: 'Marcado cambio institucional', data: null });
  });

  it('queryAuditoria envía filtros sanitizados', () => {
    service
      .queryAuditoria({ usuario: 'u', accion: 'a', ip: '', page: 0, size: 20 })
      .subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/admin/auditoria');
    expect(req.request.params.get('usuario')).toBeTruthy();
    expect(req.request.params.get('accion')).toBeTruthy();
    expect(req.request.params.get('ip')).toBeNull();
    req.flush({
      estado: 'OK',
      mensaje: '',
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 20,
        number: 0,
      },
    });
  });

  it('patchUserStatus', () => {
    service.patchUserStatus(4, { status: 'INACTIVE' }).subscribe();
    const req = httpMock.expectOne('/api/admin/users/4/status');
    expect(req.request.method).toBe('PATCH');
    req.flush({ estado: 'OK', mensaje: '', data: null });
  });

  it('getUser', () => {
    const detalle: AdminUserDetail = {
      id: 1,
      username: 'x',
      status: 'ACTIVE',
      assignedRoleIds: [],
      deniedPermissionIds: [],
    };
    service.getUser(1).subscribe();
    const req = httpMock.expectOne('/api/admin/users/1');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: '', data: detalle });
  });
});
