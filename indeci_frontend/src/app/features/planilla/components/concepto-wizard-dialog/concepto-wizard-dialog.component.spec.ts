import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  ConceptoWizardDialogComponent,
  type ConceptoWizardDialogData,
} from './concepto-wizard-dialog.component';
import type { ConceptoPlanillaInput } from '../../models/concepto-planilla.model';

const RTPS_FIXTURE = {
  estado: 'OK',
  mensaje: 'ok',
  data: [
    { codigo: '0700', descripcion: 'DESCUENTOS', esGrupo: 'S', orden: 7 },
    { codigo: '0703', descripcion: 'DESC. AUTORIZADO', esGrupo: 'N', grupoCodigo: '0700', orden: 73 },
    { codigo: '0704', descripcion: 'DESC. JUDICIAL', esGrupo: 'N', grupoCodigo: '0700', orden: 74 },
    { codigo: '0100', descripcion: 'INGRESOS', esGrupo: 'S', orden: 1 },
    { codigo: '0101', descripcion: 'REMUNERACION', esGrupo: 'N', grupoCodigo: '0100', orden: 11 },
  ],
};

// Catálogo "Tipo de planilla" (§15 — Fase A).
const PLANILLA_TIPO_FIXTURE = {
  estado: 'OK',
  mensaje: 'ok',
  data: [
    { codigo: 'CAS', nombre: 'CAS', orden: 1, activo: 1 },
    { codigo: 'CAS_TEMP', nombre: 'CAS TEMPORAL', orden: 2, activo: 1 },
    { codigo: 'CAS_ADIC', nombre: 'CAS ADICIONAL', orden: 3, activo: 1 },
  ],
};

// Catálogo "Tipo de Concepto" SISPER (§13) — clasificación del motor por fila.
const TIPO_INTERNO_FIXTURE = {
  estado: 'OK',
  mensaje: 'ok',
  data: [
    { codigo: 'REM_FIJA', nombre: 'REMUNERACION FIJA', clasificacionMotor: 'REMUNERATIVO', orden: 1 },
    { codigo: 'REINTEGRO', nombre: 'REINTEGRO', clasificacionMotor: 'REMUNERATIVO', orden: 2 },
    { codigo: 'DESC_VAR', nombre: 'DESCUENTO VARIABLE', clasificacionMotor: 'DESCUENTO', orden: 6 },
    { codigo: 'APORTE_TRAB', nombre: 'APORTE TRABAJADOR', clasificacionMotor: 'APORTE_TRABAJADOR', orden: 8 },
  ],
};

/** Página Spring del catálogo MGRH (SPEC_HOMOLOGACION_MGRH §E). */
function mgrhPage(content: unknown[]) {
  return {
    estado: 'OK',
    mensaje: 'ok',
    data: {
      content,
      totalElements: content.length,
      totalPages: 1,
      size: 5,
      number: 0,
    },
  };
}

const MGRH_INGRESO = {
  id: 11,
  tipo: 'INGRESOS',
  codigoConceptoMgrh: '0101',
  descripcionNorma: 'REMUNERACION PRINCIPAL',
  detalleNorma: 'Remuneración del cargo',
  fechaVigenciaTexto: '01/01/2026',
  fechaVigenciaDate: '2026-01-01',
  imponible: 'SI',
  descripcionTipoConcepto: 'REMUNERACION',
  tipoNorma: 'Permanente',
  estado: 'Activo',
  seleccionable: true,
  anioCatalogo: 2026,
  vigente: true,
  fuenteCatalogo: 'Conceptos2026.xls',
};

const MGRH_APORTE = {
  ...MGRH_INGRESO,
  id: 22,
  tipo: 'APORTES',
  codigoConceptoMgrh: '0901',
  descripcionNorma: 'ESSALUD',
};

function setup(data: ConceptoWizardDialogData) {
  TestBed.configureTestingModule({
    imports: [ConceptoWizardDialogComponent, NoopAnimationsModule],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: () => undefined } },
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ConceptoWizardDialogComponent);
  fixture.detectChanges();
  http.expectOne('/api/rrhh/concepto-tipo-interno').flush(TIPO_INTERNO_FIXTURE);
  http.expectOne('/api/rrhh/planilla-tipo').flush(PLANILLA_TIPO_FIXTURE);
  http.expectOne('/api/rrhh/concepto-rtps').flush(RTPS_FIXTURE);
  fixture.detectChanges();
  return { fixture, http, cmp: fixture.componentInstance };
}

describe('ConceptoWizardDialogComponent (SPEC_CONCEPTOS_PLANILLA §3.A/§6/§13 — wizard 5 tabs)', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('agrupa RTPS por cabecera y excluye los grupos (esGrupo=S) como ítems', () => {
    const s = setup({ title: 'Nuevo', modo: 'crear', initial: null });
    http = s.http;
    const grupos = s.cmp.rtpsGrupos();
    expect(grupos.map((g) => g.codigo).sort()).toEqual(['0100', '0700']);
    const desc = grupos.find((g) => g.codigo === '0700');
    expect(desc?.items.map((i) => i.codigo)).toEqual(['0703', '0704']);
  });

  it('carga el catálogo "Tipo de Concepto" y deriva la clasificación del motor', () => {
    const s = setup({ title: 'Nuevo', modo: 'crear', initial: null });
    http = s.http;
    expect(s.cmp.tiposConcepto().map((t) => t.codigo)).toContain('DESC_VAR');
    expect(s.cmp.clasificacionMotor()).toBeNull();

    s.cmp.basicosForm.patchValue({ tipoConceptoInterno: 'REM_FIJA' });
    s.fixture.detectChanges();
    expect(s.cmp.clasificacionMotor()?.label).toBe('Remunerativo');
    expect(s.cmp.visibilidad().codigoMefObligatorio).toBe(true);
  });

  it('crear: payload sin código (lo genera el backend), con tipoConceptoInterno y tipo legacy', () => {
    const s = setup({ title: 'Nuevo', modo: 'crear', initial: null });
    http = s.http;
    const ref = TestBed.inject(MatDialogRef) as MatDialogRef<unknown, ConceptoPlanillaInput | undefined>;
    const spy = vi.spyOn(ref, 'close');

    s.cmp.basicosForm.patchValue({
      nombre: ' desc judicial ',
      naturaleza: ' judicial ',
      tipoConceptoInterno: 'DESC_VAR',
    });
    s.cmp.aplicabilidadForm.patchValue({
      regimenAplicable: ['276', '1057'],
      fechaVigIni: '2026-01-01',
      planillaTipos: ['CAS', 'CAS_TEMP'],
    });
    s.cmp.clasificacionForm.patchValue({
      rtpsCodigo: '0704',
      codigoTributoSunat: '3042',
    });
    s.fixture.detectChanges();

    s.cmp.onSubmit();
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0] as ConceptoPlanillaInput;
    expect(payload.codigo ?? null).toBeNull(); // alta: backend genera CONC-####
    expect(payload.nombre).toBe('DESC JUDICIAL');
    expect(payload.tipoConceptoInterno).toBe('DESC_VAR');
    expect(payload.tipo).toBe('DESCUENTO'); // legacy derivado de la clasificación
    expect(payload.regimenAplicable).toBe('276,1057');
    expect(payload.codigoTributoSunat).toBe('3042');
    // SPEC §15 (Fase A): el payload incluye los tipos de planilla asociados.
    expect(payload.planillaTipos).toEqual(['CAS', 'CAS_TEMP']);
    // DESCUENTO no expone MUC/CUC → se fuerzan a 'N'.
    expect(payload.esMuc).toBe('N');
    expect(payload.esCuc).toBe('N');
    // P4 §14: el modo de cálculo se persiste (default RESULTADO_MOTOR).
    expect(payload.modoCalculo).toBe('RESULTADO_MOTOR');
  });

  it('crear: bloquea submit si tipo REMUNERATIVO sin código MEF (obligatorio)', () => {
    const s = setup({ title: 'Nuevo', modo: 'crear', initial: null });
    http = s.http;
    const ref = TestBed.inject(MatDialogRef);
    const spy = vi.spyOn(ref, 'close');

    s.cmp.basicosForm.patchValue({
      nombre: 'remuneracion',
      naturaleza: 'rem',
      tipoConceptoInterno: 'REM_FIJA',
    });
    s.cmp.aplicabilidadForm.patchValue({
      regimenAplicable: ['TODOS'],
      fechaVigIni: '2026-01-01',
      planillaTipos: ['CAS'],
    });
    s.fixture.detectChanges();

    expect(s.cmp.visibilidad().codigoMefObligatorio).toBe(true);
    expect(s.cmp.puedeGuardar()).toBe(false);
    s.cmp.onSubmit();
    expect(spy).not.toHaveBeenCalled();

    s.cmp.clasificacionForm.patchValue({ codigoMef: '00501' });
    s.fixture.detectChanges();
    expect(s.cmp.puedeGuardar()).toBe(true);
  });

  it('configurar: precarga valores, deriva motor y conserva el código existente en el payload', () => {
    const initial: ConceptoPlanillaInput = {
      codigo: 'CONC-0042',
      nombre: 'REMUNERACION CAS',
      tipo: 'INGRESO',
      naturaleza: 'RET CAS',
      tipoConceptoInterno: 'REM_FIJA',
      codigoMef: '00501',
      regimenAplicable: 'TODOS',
      fechaVigIni: '2026-01-01',
      afectoAportePens: 'S',
      modoCalculo: 'MONTO_FIJO',
      planillaTipos: ['CAS', 'CAS_ADIC'],
    };
    const s = setup({ title: 'Configurar', modo: 'configurar', estadoActual: 'ACTIVO', initial });
    http = s.http;
    expect(s.cmp.basicosForm.controls.tipoConceptoInterno.value).toBe('REM_FIJA');
    // P4 §14: el modo de cálculo se precarga desde el row en edición.
    expect(s.cmp.calculoForm.controls.modoCalculo.value).toBe('MONTO_FIJO');
    expect(s.cmp.clasificacionMotor()?.label).toBe('Remunerativo');
    expect(s.cmp.aplicabilidadForm.controls.regimenAplicable.value).toEqual(['TODOS']);
    // SPEC §15: precarga las planillas asociadas y resuelve sus nombres.
    expect(s.cmp.aplicabilidadForm.controls.planillaTipos.value).toEqual(['CAS', 'CAS_ADIC']);
    expect([...s.cmp.planillasSeleccionadas()]).toEqual(['CAS', 'CAS ADICIONAL']);
    expect(s.cmp.calculoForm.controls.afectoAportePens.value).toBe(true);
    expect(s.cmp.estadoLabel()).toBe('ACTIVO');

    const ref = TestBed.inject(MatDialogRef) as MatDialogRef<unknown, ConceptoPlanillaInput | undefined>;
    const spy = vi.spyOn(ref, 'close');
    s.cmp.onSubmit();
    const payload = spy.mock.calls[0][0] as ConceptoPlanillaInput;
    expect(payload.codigo).toBe('CONC-0042'); // edición: se conserva el código
    expect(payload.tipoConceptoInterno).toBe('REM_FIJA');
    expect(payload.modoCalculo).toBe('MONTO_FIJO'); // edición: se conserva el modo
    expect(payload.planillaTipos).toEqual(['CAS', 'CAS_ADIC']); // §15: se conservan
  });

  // ─────────── Homologación MGRH / MEF (SPEC_HOMOLOGACION_MGRH §G) ───────────

  it('MGRH: busca con type-ahead, selecciona una opción y la incluye como FK en el payload', async () => {
    const s = setup({ title: 'Nuevo', modo: 'crear', initial: null });
    http = s.http;

    expect(s.cmp.mgrhHomologado()).toBe(false);
    expect(s.cmp.mgrhBusqueda.disabled).toBe(true);

    s.cmp.basicosForm.patchValue({ tipoConceptoInterno: 'REM_FIJA' });
    s.fixture.detectChanges();
    expect(s.cmp.mgrhBusqueda.enabled).toBe(true);

    // debounceTime(300) del type-ahead: avanzamos timers (app zoneless, sin fakeAsync).
    vi.useFakeTimers();
    s.cmp.mgrhBusqueda.setValue('0101');
    vi.advanceTimersByTime(300);

    const req = http.expectOne((r) => r.url === '/api/rrhh/catalogo-mgrh');
    expect(req.request.params.get('texto')).toBe('0101');
    expect(req.request.params.get('tipoLocal')).toBe('INGRESO');
    expect(req.request.params.get('soloActivos')).toBe('true');
    expect(req.request.params.get('limit')).toBe('15');
    req.flush(mgrhPage([MGRH_INGRESO]));
    vi.useRealTimers();
    s.fixture.detectChanges();

    expect(s.cmp.mgrhResultados().length).toBe(1);

    // Paso 1: elegir candidato no homologa todavía.
    s.cmp.elegirCandidatoMgrh(MGRH_INGRESO as never);
    expect(s.cmp.mgrhHomologado()).toBe(false);
    expect(s.cmp.mgrhPuedeAplicar()).toBe(true);
    // Paso 2: aplicar homologa.
    s.cmp.aplicarHomologacion();
    expect(s.cmp.mgrhHomologado()).toBe(true);
    expect(s.cmp.mgrhSeleccionado()?.id).toBe(11);

    s.cmp.basicosForm.patchValue({
      nombre: 'rem',
      naturaleza: 'rem',
      tipoConceptoInterno: 'REM_FIJA',
    });
    s.cmp.aplicabilidadForm.patchValue({
      regimenAplicable: ['TODOS'],
      fechaVigIni: '2026-01-01',
      planillaTipos: ['CAS'],
    });
    s.cmp.clasificacionForm.patchValue({ codigoMef: '00501' });
    s.fixture.detectChanges();

    const ref = TestBed.inject(MatDialogRef) as MatDialogRef<unknown, ConceptoPlanillaInput | undefined>;
    const spy = vi.spyOn(ref, 'close');
    s.cmp.onSubmit();
    const payload = spy.mock.calls[0][0] as ConceptoPlanillaInput;
    expect(payload.catalogoConceptoMgrhId).toBe(11);
  });

  it('MGRH: quitar homologación vuelve a Pendiente y envía FK null', () => {
    const s = setup({ title: 'Nuevo', modo: 'crear', initial: null });
    http = s.http;
    s.cmp.elegirCandidatoMgrh(MGRH_INGRESO as never);
    s.cmp.aplicarHomologacion();
    expect(s.cmp.mgrhHomologado()).toBe(true);
    s.cmp.quitarHomologacion();
    expect(s.cmp.mgrhHomologado()).toBe(false);
    expect(s.cmp.mgrhSeleccionado()).toBeNull();
  });

  it('MGRH: advertencia de compatibilidad cuando el TIPO no coincide con la clasificación', () => {
    const s = setup({ title: 'Nuevo', modo: 'crear', initial: null });
    http = s.http;
    // Concepto remunerativo → esperado INGRESOS.
    s.cmp.basicosForm.patchValue({ tipoConceptoInterno: 'REM_FIJA' });
    s.fixture.detectChanges();

    // Selecciona un APORTES → incompatible.
    s.cmp.elegirCandidatoMgrh(MGRH_APORTE as never);
    s.cmp.aplicarHomologacion();
    expect(s.cmp.mgrhTipoIncompatible()).toBe('INGRESOS');

    // Selecciona un INGRESOS → compatible (sin advertencia).
    s.cmp.elegirCandidatoMgrh(MGRH_INGRESO as never);
    s.cmp.aplicarHomologacion();
    expect(s.cmp.mgrhTipoIncompatible()).toBeNull();
  });

  it('MGRH: precarga el detalle del homologado en edición vía búsqueda por código', () => {
    const initial: ConceptoPlanillaInput = {
      codigo: 'CONC-0042',
      nombre: 'REMUNERACION',
      tipo: 'INGRESO',
      naturaleza: 'REM',
      tipoConceptoInterno: 'REM_FIJA',
      regimenAplicable: 'TODOS',
      fechaVigIni: '2026-01-01',
      planillaTipos: ['CAS'],
      catalogoConceptoMgrhId: 11,
    };
    // Nota: precargarHomologacion dispara una búsqueda puntual ANTES de los
    // catálogos del wizard, por lo que la consumimos primero.
    TestBed.configureTestingModule({
      imports: [ConceptoWizardDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            title: 'Configurar',
            modo: 'configurar',
            estadoActual: 'ACTIVO',
            initial,
            mgrhResumen: {
              id: 11,
              tipo: 'INGRESOS',
              codigoConceptoMgrh: '0101',
              descripcionNorma: 'REMUNERACION PRINCIPAL',
            },
          } satisfies ConceptoWizardDialogData,
        },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ConceptoWizardDialogComponent);
    fixture.detectChanges();

    const mgrhReq = http.expectOne((r) => r.url === '/api/rrhh/catalogo-mgrh');
    expect(mgrhReq.request.params.get('codigo')).toBe('0101');
    mgrhReq.flush(mgrhPage([MGRH_INGRESO]));

    http.expectOne('/api/rrhh/concepto-tipo-interno').flush(TIPO_INTERNO_FIXTURE);
    http.expectOne('/api/rrhh/planilla-tipo').flush(PLANILLA_TIPO_FIXTURE);
    http.expectOne('/api/rrhh/concepto-rtps').flush(RTPS_FIXTURE);
    fixture.detectChanges();

    expect(fixture.componentInstance.mgrhHomologado()).toBe(true);
    expect(fixture.componentInstance.mgrhSeleccionado()?.codigoConceptoMgrh).toBe('0101');
    expect(fixture.componentInstance.mgrhResumenLinea()).toContain('0101');
  });
});
