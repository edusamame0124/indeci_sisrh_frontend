import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content tabindex="0">{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" mat-button (click)="onCancel()" [attr.aria-label]="cancelText">
        {{ cancelText }}
      </button>
      <button
        type="button"
        mat-flat-button
        color="warn"
        (click)="onConfirm()"
        [attr.aria-label]="confirmText"
      >
        {{ confirmText }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  readonly cancelText: string;
  readonly confirmText: string;

  constructor(
    private readonly dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: ConfirmDialogData,
  ) {
    this.cancelText = data.cancelLabel ?? 'Cancelar';
    this.confirmText = data.confirmLabel ?? 'Confirmar';
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
