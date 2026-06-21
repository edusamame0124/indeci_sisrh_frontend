import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-subsidio-motivo-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Motivo de reversión</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="motivo-field">
        <mat-label>Motivo sustentado</mat-label>
        <textarea matInput rows="3" [formControl]="motivoCtrl" required maxlength="500"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="warn" type="button" [disabled]="motivoCtrl.invalid" (click)="confirmar()">
        Revertir
      </button>
    </mat-dialog-actions>
  `,
  styles: `.motivo-field { width: 100%; min-width: 360px; }`,
})
export class SubsidioMotivoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<SubsidioMotivoDialogComponent, string | null>);

  readonly motivoCtrl = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.minLength(10),
  ]);

  confirmar(): void {
    if (this.motivoCtrl.invalid) return;
    this.dialogRef.close(this.motivoCtrl.value.trim());
  }
}
