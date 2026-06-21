import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ParametroPrevisionalApiService } from '../../../../../../services/parametro-previsional-api.service';
import type { AfpParametroRow, OnpParametroRow } from '../../../../../../models/parametro-previsional.model';
import { type Observable } from 'rxjs';

export type EliminarTipo = 'AFP' | 'ONP';

export interface EliminarVigenciaDialogData {
  tipo: EliminarTipo;
  row: AfpParametroRow | OnpParametroRow;
}

@Component({
  selector: 'app-eliminar-vigencia-dialog',
  standalone: true,
  imports: [
    TitleCasePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './eliminar-vigencia-dialog.component.html',
  styleUrl: './eliminar-vigencia-dialog.component.css',
})
export class EliminarVigenciaDialogComponent {
  private readonly fb        = inject(FormBuilder);
  private readonly api       = inject(ParametroPrevisionalApiService);
  private readonly dialogRef = inject(MatDialogRef<EliminarVigenciaDialogComponent>);
  readonly data              = inject<EliminarVigenciaDialogData>(MAT_DIALOG_DATA);

  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.group({
    motivo: ['', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(1000),
    ]],
  });

  readonly motivosSugeridos = [
    'Vigencia duplicada por error.',
    'Vigencia creada con período incorrecto.',
    'Parámetros ingresados por error.',
    'Registro reemplazado por nueva vigencia validada.',
  ] as const;

  get isAfp(): boolean            { return this.data.tipo === 'AFP'; }
  get afpRow(): AfpParametroRow   { return this.data.row as AfpParametroRow; }
  get onpRow(): OnpParametroRow   { return this.data.row as OnpParametroRow; }

  aplicarSugerencia(sugerencia: string): void {
    this.form.patchValue({ motivo: sugerencia });
    this.form.markAsDirty();
  }

  confirmarEliminar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set(null);

    const body = { motivo: this.form.value.motivo! };

    const call$: Observable<unknown> = this.isAfp
      ? this.api.eliminarAfpVigencia(this.data.row.id, body)
      : this.api.eliminarOnpVigencia(this.data.row.id, body);

    call$.subscribe({
      next: () => { this.saving.set(false); this.dialogRef.close(true); },
      error: (err: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.errorMsg.set(
          err?.error?.message ??
          'No se pudo procesar la eliminación. Verifique la trazabilidad antes de continuar.'
        );
      },
    });
  }
}
