import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface CatalogNameFormDialogData {
  readonly title: string;
  readonly nameLabel: string;
  readonly initialName: string;
  readonly submitLabel: string;
}

@Component({
  selector: 'app-catalog-name-form-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title id="catalog-name-dialog-title">{{ data.title }}</h2>
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content tabindex="0">
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ data.nameLabel }}</mat-label>
          <input
            matInput
            formControlName="name"
            autocomplete="off"
            [attr.aria-labelledby]="'catalog-name-dialog-title'"
          />
          @if (form.controls.name.hasError('required') && form.controls.name.touched) {
            <mat-error>Este campo es obligatorio</mat-error>
          }
          @if (form.controls.name.hasError('maxlength')) {
            <mat-error>Máximo 200 caracteres</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" mat-button (click)="dialogRef.close()" [attr.aria-label]="'Cancelar'">
          Cancelar
        </button>
        <button type="submit" mat-flat-button color="primary" [attr.aria-label]="data.submitLabel">
          {{ data.submitLabel }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 320px;
        max-width: 480px;
      }
      .full {
        width: 100%;
      }
    `,
  ],
})
export class CatalogNameFormDialogComponent {
  readonly data: CatalogNameFormDialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<CatalogNameFormDialogComponent, string | undefined>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control(this.data.initialName, {
      validators: [Validators.required, Validators.maxLength(200)],
    }),
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue().name.trim().toUpperCase();
    this.dialogRef.close(v);
  }
}
