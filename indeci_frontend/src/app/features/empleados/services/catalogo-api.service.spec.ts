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

  // ============================================================
  // Catálogos extendidos Spec 009 — 15 GETs nuevos
  // ============================================================

  function flushCatalog(url: string, data: unknown): void {
    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'ok', data });
  }

  it('listarRegimenesPensionarios extrae data', () => {
    const data = [{ id: 1, nombre: 'INTEGRA', codigo: 'INT', tipo: 'AFP', activo: 1 }];
    let out;
    service.listarRegimenesPensionarios().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/regimenes-pensionarios', data);
    expect(out).toEqual(data);
  });

  it('listarTiposComisionAfp extrae data', () => {
    const data = [{ id: 1, codigo: 'FL', nombre: 'POR FLUJO' }];
    let out;
    service.listarTiposComisionAfp().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/tipos-comision-afp', data);
    expect(out).toEqual(data);
  });

  it('listarSexos extrae data', () => {
    const data = [{ id: 1, codigo: 'M', nombre: 'Masculino' }];
    let out;
    service.listarSexos().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/sexos', data);
    expect(out).toEqual(data);
  });

  it('listarEstadosCiviles extrae data', () => {
    const data = [{ id: 1, codigo: 'S', nombre: 'Soltero(a)' }];
    let out;
    service.listarEstadosCiviles().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/estados-civiles', data);
    expect(out).toEqual(data);
  });

  it('listarTiposDocumento extrae data', () => {
    const data = [{ id: 1, codigo: 'DNI', nombre: 'DNI' }];
    let out;
    service.listarTiposDocumento().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/tipos-documento', data);
    expect(out).toEqual(data);
  });

  it('listarTiposPersonal extrae data', () => {
    const data = [{ id: 1, codigo: 'NOM', nombre: 'Nombrado' }];
    let out;
    service.listarTiposPersonal().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/tipos-personal', data);
    expect(out).toEqual(data);
  });

  it('listarProfesiones extrae data', () => {
    const data = [{ id: 1, nombre: 'INGENIERÍA DE SISTEMAS', activo: 1 }];
    let out;
    service.listarProfesiones().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/profesiones', data);
    expect(out).toEqual(data);
  });

  it('listarGradosAcademicos extrae data', () => {
    const data = [{ id: 1, nombre: 'BACHILLER', activo: 1 }];
    let out;
    service.listarGradosAcademicos().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/grados-academicos', data);
    expect(out).toEqual(data);
  });

  it('listarNiveles extrae data', () => {
    const data = [{ id: 1, codigo: 'N1', nombre: 'Nivel 1' }];
    let out;
    service.listarNiveles().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/niveles', data);
    expect(out).toEqual(data);
  });

  it('listarSedes extrae data', () => {
    const data = [
      { id: 1, nombre: 'SEDE CENTRAL', direccion: 'AV. EJ.', telefono: '01-000', activo: 1 },
    ];
    let out;
    service.listarSedes().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/sedes', data);
    expect(out).toEqual(data);
  });

  it('listarOficinas extrae data', () => {
    const data = [{ id: 1, sedeId: 1, nombre: 'OFICINA TIC', sigla: 'TIC', activo: 1 }];
    let out;
    service.listarOficinas().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/oficinas', data);
    expect(out).toEqual(data);
  });

  it('listarOficinasPorSede filtra por sedeId', () => {
    const data = [{ id: 1, sedeId: 5, nombre: 'OFI 1', sigla: 'O1', activo: 1 }];
    let out;
    service.listarOficinasPorSede(5).subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/oficinas/sede/5', data);
    expect(out).toEqual(data);
  });

  it('listarDependencias extrae data', () => {
    const data = [{ id: 1, nombre: 'DGE', sigla: 'DGE' }];
    let out;
    service.listarDependencias().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/dependencias', data);
    expect(out).toEqual(data);
  });

  it('listarEstructurasOrganicas extrae data', () => {
    const data = [{ id: 1, codigo: '01', nombre: 'DIRECCIÓN' }];
    let out;
    service.listarEstructurasOrganicas().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/estructuras-organicas', data);
    expect(out).toEqual(data);
  });

  it('listarRegimenesLaborales extrae data', () => {
    const data = [{ id: 1, codigo: 'DL276', nombre: 'D.L. 276', activo: 1 }];
    let out;
    service.listarRegimenesLaborales().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/regimenes-laborales', data);
    expect(out).toEqual(data);
  });

  it('listarTiposContrato extrae data', () => {
    const data = [{ id: 1, codigo: 'IND', nombre: 'Indeterminado', activo: 1 }];
    let out;
    service.listarTiposContrato().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/tipos-contrato', data);
    expect(out).toEqual(data);
  });

  it('listarCondicionesLaborales extrae data', () => {
    const data = [{ id: 1, codigo: 'ACT', nombre: 'Activo', activo: 1 }];
    let out;
    service.listarCondicionesLaborales().subscribe((x) => {
      out = x;
    });
    flushCatalog('/api/catalogos/condiciones-laborales', data);
    expect(out).toEqual(data);
  });
});
