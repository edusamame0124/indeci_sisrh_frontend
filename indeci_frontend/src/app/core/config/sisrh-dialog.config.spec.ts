import { describe, expect, it } from 'vitest';

import {
  SISRH_DIALOG_SHELL_CLASS,
  SISRH_DIALOG_SHELL_CONFIRM,
  SISRH_DIALOG_SHELL_FORM,
  SISRH_DIALOG_SHELL_LARGE,
  SISRH_DIALOG_SHELL_MOBILE_SHEET,
  SISRH_MODAL_BACKDROP_CLASS,
  sisrhConfirmDialogConfig,
  sisrhFormDialogConfig,
  sisrhLargeDialogConfig,
} from './sisrh-dialog.config';

describe('sisrh-dialog.config', () => {
  it('sisrhConfirmDialogConfig aplica backdrop y shell de confirmación', () => {
    const cfg = sisrhConfirmDialogConfig({
      title: 'Título',
      message: 'Mensaje',
    });
    expect(cfg.backdropClass).toBe(SISRH_MODAL_BACKDROP_CLASS);
    expect(cfg.panelClass).toContain(SISRH_DIALOG_SHELL_CLASS);
    expect(cfg.panelClass).toContain(SISRH_DIALOG_SHELL_CONFIRM);
    expect(cfg.width).toBe('min(440px, 92vw)');
    expect(cfg.restoreFocus).toBe(true);
  });

  it('sisrhFormDialogConfig sm vs md define ancho y sheet en móvil solo en md', () => {
    const sm = sisrhFormDialogConfig('sm', { data: { x: 1 } });
    const md = sisrhFormDialogConfig('md', { data: { x: 1 } });
    expect(sm.width).toBe('min(400px, 92vw)');
    expect(md.width).toBe('min(520px, 92vw)');
    expect(sm.panelClass).toContain(SISRH_DIALOG_SHELL_FORM);
    expect(md.panelClass).toContain(SISRH_DIALOG_SHELL_MOBILE_SHEET);
    expect(sm.panelClass).not.toContain(SISRH_DIALOG_SHELL_MOBILE_SHEET);
  });

  it('sisrhLargeDialogConfig aplica shell large y bottom-sheet', () => {
    const cfg = sisrhLargeDialogConfig({ data: { mode: 'create' } });
    expect(cfg.panelClass).toContain(SISRH_DIALOG_SHELL_LARGE);
    expect(cfg.panelClass).toContain(SISRH_DIALOG_SHELL_MOBILE_SHEET);
    expect(cfg.width).toBe('min(680px, 96vw)');
    expect(cfg.maxHeight).toBe('92vh');
    expect(cfg.autoFocus).toBe('first-heading');
  });
});
