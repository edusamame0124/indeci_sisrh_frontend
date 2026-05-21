import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let closedWith: boolean | undefined;

  function build(data: ConfirmDialogData) {
    closedWith = undefined;
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        provideAnimationsAsync('noop'),
        {
          provide: MatDialogRef,
          useValue: { close: (v: boolean) => { closedWith = v; } },
        },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('muestra título, mensaje e icono según severity danger', () => {
    const fixture = build({
      title: 'Eliminar',
      message: '¿Continuar?',
      severity: 'danger',
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#confirm-dialog-title')?.textContent?.trim()).toBe('Eliminar');
    expect(el.textContent).toContain('¿Continuar?');
    expect(el.querySelector('.sisrh-confirm-icon--danger')).toBeTruthy();
    expect(fixture.componentInstance.confirmColor()).toBe('warn');
  });

  it('usa primary en severity info', () => {
    const fixture = build({
      title: 'Generar',
      message: 'Mensaje',
      severity: 'info',
    });
    expect(fixture.componentInstance.confirmColor()).toBe('primary');
  });

  it('onConfirm cierra con true y onCancel con false', () => {
    const fixture = build({ title: 'T', message: 'M' });
    fixture.componentInstance.onConfirm();
    expect(closedWith).toBe(true);
    fixture.componentInstance.onCancel();
    expect(closedWith).toBe(false);
  });

  it('respeta confirmColor explícito', () => {
    const fixture = build({
      title: 'T',
      message: 'M',
      severity: 'danger',
      confirmColor: 'primary',
    });
    expect(fixture.componentInstance.confirmColor()).toBe('primary');
  });
});
