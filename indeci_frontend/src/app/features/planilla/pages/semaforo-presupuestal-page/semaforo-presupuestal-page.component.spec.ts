import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SemaforoPresupuestalPageComponent } from './semaforo-presupuestal-page.component';
import type {
  SemaforoMeta,
  SemaforoPresupuestal,
} from '../../models/semaforo-presupuestal.model';

describe('SemaforoPresupuestalPageComponent (Spec 012 / C1 · P-05)', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function provideStubRoute(id: string = '1') {
    return {
      provide: ActivatedRoute,
      useValue: {
        snapshot: { paramMap: { get: (k: string) => (k === 'id' ? id : null) } },
      },
    };
  }

  function build(id: string = '1') {
    TestBed.configureTestingModule({
      imports: [SemaforoPresupuestalPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideStubRoute(id),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    const fixture = TestBed.createComponent(SemaforoPresupuestalPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  const meta = (over: Partial<SemaforoMeta>): SemaforoMeta => ({
    meta: '0056',
    centroCosto: 'OGDN',
    fuenteFinanc: 'RO',
    pea: 2,
    montoCertificado: 5000,
    montoComprometido: 2700,
    saldo: 2300,
    estado: 'VERDE',
    ...over,
  });

  const semaforo = (metas: SemaforoMeta[]): SemaforoPresupuestal => ({
    periodoId: 1,
    periodo: '2026-05',
    metas,
    totalCertificado: metas.reduce((s, m) => s + m.montoCertificado, 0),
    totalComprometido: metas.reduce((s, m) => s + m.montoComprometido, 0),
    estadoGlobal: metas.some((m) => m.estado === 'ROJO') ? 'ROJO' : 'VERDE',
  });

  function flushSemaforo(data: SemaforoPresupuestal, id: string = '1') {
    httpMock.expectOne(`/api/rrhh/meta-presupuestal/semaforo/${id}`).flush({ data });
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('carga el semáforo del período y arma las filas', () => {
    const fixture = build('1');
    flushSemaforo(semaforo([meta({})]));
    const comp = fixture.componentInstance;
    expect(comp.semaforo()?.periodo).toBe('2026-05');
    expect(comp.filas().length).toBe(1);
    expect(comp.loading()).toBe(false);
  });

  it('inicializa los montos editables y la fila "(sin meta)" no es certificable', () => {
    const fixture = build('1');
    flushSemaforo(
      semaforo([
        meta({}),
        meta({ meta: '(sin meta)', montoCertificado: 0, estado: 'ROJO' }),
      ]),
    );
    const comp = fixture.componentInstance;
    expect(comp.montoEditado('0056')).toBe(5000);
    expect(comp.esCertificable('0056')).toBe(true);
    expect(comp.esCertificable('(sin meta)')).toBe(false);
  });

  it('guardar() hace PUT solo con las metas certificables y recarga', () => {
    const fixture = build('1');
    flushSemaforo(
      semaforo([
        meta({}),
        meta({ meta: '(sin meta)', montoCertificado: 0, estado: 'ROJO' }),
      ]),
    );
    const comp = fixture.componentInstance;
    comp.onMontoChange('0056', 8000);

    comp.guardar();

    const req = httpMock.expectOne('/api/rrhh/meta-presupuestal/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.length).toBe(1); // "(sin meta)" excluida
    expect(req.request.body[0].meta).toBe('0056');
    expect(req.request.body[0].montoCertificado).toBe(8000);
    req.flush({ data: null });

    flushSemaforo(semaforo([meta({ montoCertificado: 8000 })])); // recarga
  });

  it('redirige a /planilla/periodos si el id de URL es inválido', () => {
    build('xyz');
    expect(router.navigate).toHaveBeenCalledWith(['/planilla/periodos']);
  });
});
