import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogoApiService } from './catalogo-api.service';
import type { UbigeoOption } from '../models/ubigeo.model';

describe('CatalogoApiService', () => {
  let service: CatalogoApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogoApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogoApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listarUbigeo extrae data del ApiResponse', () => {
    const data: UbigeoOption[] = [
      {
        id: '150131',
        distrito: 'SAN ISIDRO',
        provincia: 'LIMA',
        departamento: 'LIMA',
      },
    ];
    let out;
    service.listarUbigeo().subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/catalogos/ubigeo');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'Ubigeo completo', data });
    expect(out).toEqual(data);
  });

  it('listarBancos extrae data', () => {
    const data = [{ id: 1, name: 'Banco Test' }];
    let out;
    service.listarBancos().subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/catalogos/bancos');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('listarTiposCuenta extrae data', () => {
    const data = [{ id: 2, name: 'Ahorros' }];
    let out;
    service.listarTiposCuenta().subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/catalogos/tipos-cuenta');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('crearBanco POST extrae data', () => {
    const data = { id: 9, name: 'NUEVO BANCO' };
    let out;
    service.crearBanco({ name: 'NUEVO BANCO' }).subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/catalogos/bancos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'NUEVO BANCO' });
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('actualizarBanco PUT extrae data', () => {
    const data = { id: 1, name: 'EDITADO' };
    let out;
    service.actualizarBanco(1, { name: 'EDITADO' }).subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/catalogos/bancos/1');
    expect(req.request.method).toBe('PUT');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('eliminarBanco DELETE', () => {
    let done = false;
    service.eliminarBanco(1).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/catalogos/bancos/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });

  it('crearTipoCuenta POST', () => {
    const data = { id: 3, name: 'CTS' };
    let out;
    service.crearTipoCuenta({ name: 'CTS' }).subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/catalogos/tipos-cuenta');
    expect(req.request.method).toBe('POST');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('actualizarTipoCuenta PUT', () => {
    const data = { id: 3, name: 'CTS EDIT' };
    let out;
    service.actualizarTipoCuenta(3, { name: 'CTS EDIT' }).subscribe((x) => {
      out = x;
    });
    const req = httpMock.expectOne('/api/catalogos/tipos-cuenta/3');
    expect(req.request.method).toBe('PUT');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
    expect(out).toEqual(data);
  });

  it('eliminarTipoCuenta DELETE', () => {
    let done = false;
    service.eliminarTipoCuenta(2).subscribe(() => {
      done = true;
    });
    const req = httpMock.expectOne('/api/catalogos/tipos-cuenta/2');
    expect(req.request.method).toBe('DELETE');
    req.flush({ estado: 'OK', mensaje: 'ok', data: null });
    expect(done).toBe(true);
  });
});
