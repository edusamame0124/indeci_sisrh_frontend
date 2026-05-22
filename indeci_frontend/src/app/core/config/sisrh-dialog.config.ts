import type { MatDialogConfig } from '@angular/material/dialog';
import type { ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';

/** Backdrop oscuro institucional (styles.scss). */
export const SISRH_MODAL_BACKDROP_CLASS = 'sisrh-modal-backdrop';

/** Shell base del panel de diálogo. */
export const SISRH_DIALOG_SHELL_CLASS = 'sisrh-dialog-shell';

export const SISRH_DIALOG_SHELL_CONFIRM = 'sisrh-dialog-shell--confirm';
export const SISRH_DIALOG_SHELL_FORM = 'sisrh-dialog-shell--form';
export const SISRH_DIALOG_SHELL_LARGE = 'sisrh-dialog-shell--large';
export const SISRH_DIALOG_SHELL_MOBILE_SHEET = 'sisrh-dialog-shell--mobile-sheet';

/** @deprecated Usar SISRH_DIALOG_SHELL_LARGE; alias para compatibilidad temporal. */
export const SISRH_PERSONA_DIALOG_SHELL_CLASS = 'sisrh-persona-dialog-shell';

export type SisrhFormDialogSize = 'sm' | 'md';

const FORM_WIDTH: Record<SisrhFormDialogSize, string> = {
  sm: 'min(400px, 92vw)',
  md: 'min(520px, 92vw)',
};

function mergePanelClass(
  base: string[],
  override: string | string[] | undefined,
): string[] {
  if (!override) {
    return base;
  }
  const extra = Array.isArray(override) ? override : [override];
  return [...base, ...extra];
}

/** Defaults compartidos por todos los modales SISRH. */
export function sisrhDialogDefaults(): Pick<
  MatDialogConfig,
  'backdropClass' | 'restoreFocus' | 'autoFocus'
> {
  return {
    backdropClass: SISRH_MODAL_BACKDROP_CLASS,
    restoreFocus: true,
    autoFocus: 'first-tabbable',
  };
}

function shellPanelClasses(...extra: string[]): string[] {
  return [SISRH_DIALOG_SHELL_CLASS, ...extra];
}

/** Config para diálogos de confirmación. */
export function sisrhConfirmDialogConfig(
  data: ConfirmDialogData,
  overrides: MatDialogConfig<ConfirmDialogData> = {},
): MatDialogConfig<ConfirmDialogData> {
  const { panelClass: overridePanel, ...rest } = overrides;
  return {
    ...sisrhDialogDefaults(),
    width: 'min(440px, 92vw)',
    maxHeight: '90vh',
    data,
    ...rest,
    panelClass: mergePanelClass(
      shellPanelClasses(SISRH_DIALOG_SHELL_CONFIRM),
      overridePanel,
    ),
  };
}

/** Config para formularios en modal (catálogos, periodo, conceptos, etc.). */
export function sisrhFormDialogConfig<T = unknown>(
  size: SisrhFormDialogSize = 'md',
  overrides: MatDialogConfig<T> = {},
): MatDialogConfig<T> {
  const mobileSheet = size === 'md';
  const basePanel = shellPanelClasses(
    SISRH_DIALOG_SHELL_FORM,
    ...(mobileSheet ? [SISRH_DIALOG_SHELL_MOBILE_SHEET] : []),
  );
  const { panelClass: overridePanel, ...rest } = overrides;
  return {
    ...sisrhDialogDefaults(),
    width: FORM_WIDTH[size],
    maxHeight: '90vh',
    ...rest,
    panelClass: mergePanelClass(basePanel, overridePanel),
  };
}

/** Config para modales grandes (persona crear/editar). Bottom-sheet en móvil. */
export function sisrhLargeDialogConfig<T = unknown>(
  overrides: MatDialogConfig<T> = {},
): MatDialogConfig<T> {
  const basePanel = shellPanelClasses(
    SISRH_DIALOG_SHELL_LARGE,
    SISRH_DIALOG_SHELL_MOBILE_SHEET,
  );
  const { panelClass: overridePanel, autoFocus, ...rest } = overrides;
  return {
    ...sisrhDialogDefaults(),
    width: 'min(680px, 96vw)',
    maxHeight: '92vh',
    autoFocus: autoFocus ?? 'first-heading',
    ...rest,
    panelClass: mergePanelClass(basePanel, overridePanel),
  };
}
