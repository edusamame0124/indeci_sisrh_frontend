import { describe, expect, it, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  PlanillaTipoFormDialogComponent,
  type PlanillaTipoFormDialogData,
} from './planilla-tipo-form-dialog.component';
import type { PlanillaTipoInput } from '../../models/planilla-tipo.model';

function setup(data: PlanillaTipoFormDialogData) {
  TestBed.configureTestingModule({
    imports: [PlanillaTipoFormDialogComponent, NoopAnimationsModule],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(PlanillaTipoFormDialogComponent);
  fixture.detectChanges();
  return { fixture, cmp: fixture.componentInstance };
}

describe('PlanillaTipoFormDialogComponent (SPEC_CONCEPTOS_PLANILLA §15 — Fase A)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('crear: normaliza código/nombre a MAYÚSCULAS y mapea activo → 1', () => {
    const s = setup({ title: 'Nuevo', modo: 'crear', submitLabel: 'Guardar', initial: null });
    const ref = TestBed.inject(MatDialogRef) as MatDialogRef<unknown, PlanillaTipoInput | undefined>;
    const spy = vi.spyOn(ref, 'close');

    s.cmp.form.patchValue({ codigo: ' cas_temp ', nombre: ' cas temporal ', orden: 2, activo: true });
    s.cmp.onSubmit();

    const payload = spy.mock.calls[0][0] as PlanillaTipoInput;
    expect(payload).toEqual({ codigo: 'CAS_TEMP', nombre: 'CAS TEMPORAL', orden: 2, activo: 1 });
  });

  it('crear: bloquea submit si falta código o nombre', () => {
    const s = setup({ title: 'Nuevo', modo: 'crear', submitLabel: 'Guardar', initial: null });
    const ref = TestBed.inject(MatDialogRef);
    const spy = vi.spyOn(ref, 'close');
    s.cmp.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('editar: el código queda deshabilitado (es la PK) y se conserva en el payload', () => {
    const s = setup({
      title: 'Editar',
      modo: 'editar',
      submitLabel: 'Guardar cambios',
      initial: { codigo: 'CAS', nombre: 'CAS', orden: 1, activo: 0 },
    });
    expect(s.cmp.form.controls.codigo.disabled).toBe(true);

    const ref = TestBed.inject(MatDialogRef) as MatDialogRef<unknown, PlanillaTipoInput | undefined>;
    const spy = vi.spyOn(ref, 'close');
    s.cmp.form.patchValue({ nombre: 'cas reactivado', activo: true });
    s.cmp.onSubmit();

    const payload = spy.mock.calls[0][0] as PlanillaTipoInput;
    expect(payload.codigo).toBe('CAS');
    expect(payload.nombre).toBe('CAS REACTIVADO');
    expect(payload.activo).toBe(1);
  });
});
