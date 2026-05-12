import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PersonaApiService } from './persona-api.service';
import type { PersonaEmpleado } from '../models/persona-empleado.model';

describe('PersonaApiService', () => {
  let service: PersonaApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PersonaApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PersonaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const ejemploRespuesta = (): PersonaEmpleado => ({
    id: 99,
    nombreCompleto: 'PRUEBA UNO',
    dni: '12345678',
    email: 'p@test.gob.pe',
    telefono: '987654321',
    direccion: 'JR LOS ROBLES',
    distritoId: '150131',
    codigoInterno: 'IND-A001',
    estado: 'ACTIVO',
  });

  it('listar extrae data del ApiResponse', () => {
    const esperados = [ejemploRespuesta()];
    let resultado;
    service.listar().subscribe((x) => {
      resultado = x;
    });

    const req = httpMock.expectOne('/api/rrhh/persona');
    expect(req.request.method).toBe('GET');
    req.flush({ estado: 'OK', mensaje: 'Listado correcto', data: esperados });

    expect(resultado).toEqual(esperados);
  });

  it('guardar POST personaEmpleadoInput body JSON', () => {
    const body = {
      nombreCompleto: 'Nuevo',
      dni: '87654321',
      email: 'n@test.gob.pe',
      telefono: '',
      direccion: 'JR LOS ROBLOS II ETAPA MZ LT ',
      distritoId: '150131',
      codigoInterno: '',
      estado: 'ACTIVO',
    };

    service.guardar(body).subscribe();

    const req = httpMock.expectOne('/api/rrhh/persona');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ estado: 'OK', mensaje: 'Registrado correctamente', data: null });
  });

  it('eliminar DELETE persona/id', () => {
    service.eliminar(99).subscribe();

    const req = httpMock.expectOne('/api/rrhh/persona/99');
    expect(req.request.method).toBe('DELETE');
    req.flush({ estado: 'OK', mensaje: 'Eliminado correctamente', data: null });
  });
});
