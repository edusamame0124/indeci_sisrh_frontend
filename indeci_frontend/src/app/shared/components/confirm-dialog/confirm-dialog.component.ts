import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, computed } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type ConfirmDialogSeverity = 'danger' | 'warning' | 'info';

export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** Icono y acento visual; por defecto danger. */
  readonly severity?: ConfirmDialogSeverity;
  /** Color del botón confirmar; por defecto según severity. */
  readonly confirmColor?: 'primary' | 'warn';
}

const SEVERITY_ICON: Record<ConfirmDialogSeverity, string> = {
  danger: 'error_outline',
  warning: 'warning_amber',
  info: 'info_outline',
};

const SEVERITY_ICON_CLASS: Record<ConfirmDialogSeverity, string> = {
  danger: 'sisrh-confirm-icon--danger',
  warning: 'sisrh-confirm-icon--warning',
  info: 'sisrh-confirm-icon--info',
};

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgClass, MatDialogModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sisrh-confirm-header" role="group" aria-labelledby="confirm-dialog-title">
      <mat-icon class="sisrh-confirm-icon" [ngClass]="iconClass()" aria-hidden="true">{{
        iconName()
      }}</mat-icon>
      <h2 mat-dialog-title id="confirm-dialog-title" class="sisrh-confirm-title">{{ data.title }}</h2>
      <button
        type="button"
        mat-icon-button
        mat-dialog-close
        class="sisrh-confirm-close"
        aria-label="Cerrar"
      >
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <mat-dialog-content tabindex="0" class="sisrh-confirm-message">{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" mat-button (click)="onCancel()" [attr.aria-label]="cancelText">
        {{ cancelText }}
      </button>
      <button
        type="button"
        mat-flat-button
        [color]="confirmColor()"
        (click)="onConfirm()"
        [attr.aria-label]="confirmText"
      >
        {{ confirmText }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: min(320px, 92vw);
        max-width: 480px;
      }

      .sisrh-confirm-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px 20px 12px;
        background: var(--sisrh-toolbar-bg, #e2e8f0);
        border-bottom: 1px solid var(--sisrh-color-border, #e2e8f0);
      }

      .sisrh-confirm-icon {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        font-size: 28px;
        margin-top: 2px;
      }

      .sisrh-confirm-icon--danger {
        color: var(--sisrh-badge-danger-fg, #b42318);
      }

      .sisrh-confirm-icon--warning {
        color: var(--sisrh-badge-warning-fg, #b7791f);
      }

      .sisrh-confirm-icon--info {
        color: var(--sisrh-badge-info-fg, #2563a6);
      }

      .sisrh-confirm-title {
        flex: 1;
        margin: 0;
        padding: 0;
        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);
        font-size: 1.0625rem;
        font-weight: 600;
        line-height: 1.35;
        color: var(--sisrh-color-text, #020617);
        background: transparent;
        border: none;
      }

      .sisrh-confirm-close {
        flex-shrink: 0;
        margin: -4px -8px 0 0;
      }

      .sisrh-confirm-message {
        font-size: 14px;
        line-height: 1.5;
        color: var(--sisrh-color-muted, #64748b);
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  readonly cancelText: string;
  readonly confirmText: string;
  private readonly severity: ConfirmDialogSeverity;

  readonly iconName = computed(() => SEVERITY_ICON[this.severity]);
  readonly iconClass = computed(() => SEVERITY_ICON_CLASS[this.severity]);
  readonly confirmColor = computed(() => this.resolveConfirmColor());

  constructor(
    private readonly dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: ConfirmDialogData,
  ) {
    this.cancelText = data.cancelLabel ?? 'Cancelar';
    this.confirmText = data.confirmLabel ?? 'Confirmar';
    this.severity = data.severity ?? 'danger';
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  private resolveConfirmColor(): 'primary' | 'warn' {
    if (this.data.confirmColor) {
      return this.data.confirmColor;
    }
    return this.severity === 'danger' ? 'warn' : 'primary';
  }
}
