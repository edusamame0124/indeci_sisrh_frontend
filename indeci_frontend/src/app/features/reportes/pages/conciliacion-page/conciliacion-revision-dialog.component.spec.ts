import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  ConciliacionRevisionDialogComponent,
  type ConciliacionRevisionResult,
} from './conciliacion-revision-dialog.component';

describe('ConciliacionRevisionDialogComponent (Spec 010 PANTALLA-06)', () => {
  function build() {
    const closed: (ConciliacionRevisionResult | undefined)[] = [];
    const dialogRef = { close: vi.fn((r?: ConciliacionRevisionResult) => closed.push(r)) };

    TestBed.configureTestingModule({
      imports: [ConciliacionRevisionDialogComponent],
      providers: [
        provideAnimationsAsync('noop'),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { nombre: 'Ana Lopez', diferencia: 150 } },
      ],
    });
    const fixture = TestBed.createComponent(ConciliacionRevisionDialogComponent);
    fixture.detectChanges();
    return { comp: fixture.componentInstance, dialogRef, closed };
  }

  it('confirmar con justificación cierra el diálogo con estado y texto', () => {
    const { comp, closed } = build();
    comp.estado = 'JUSTIFICADO';
    comp.justificacion.set('Diferencia por reintegro');

    comp.onConfirm();

    expect(closed[0]).toEqual({
      estado: 'JUSTIFICADO',
      justificacion: 'Diferencia por reintegro',
    });
  });

  it('confirmar sin justificación no cierra el diálogo', () => {
    const { comp, dialogRef } = build();
    comp.justificacion.set('   ');

    comp.onConfirm();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancelar cierra el diálogo sin resultado', () => {
    const { comp, closed } = build();
    comp.onCancel();
    expect(closed[0]).toBeUndefined();
  });
});
