import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EssaludApiService } from '../../../../../../services/essalud-api.service';
import type { EssaludVigenciaRow } from '../../../../../../models/essalud.model';

export interface DuplicarEssaludDialogData { row: EssaludVigenciaRow; }

@Component({
  selector: 'app-duplicar-essalud-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatIconModule, MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './duplicar-essalud-dialog.component.html',
  styleUrl: './duplicar-essalud-dialog.component.css',
})
export class DuplicarEssaludDialogComponent {
  private readonly api       = inject(EssaludApiService);
  private readonly dialogRef = inject(MatDialogRef<DuplicarEssaludDialogComponent>);
  readonly data              = inject<DuplicarEssaludDialogData>(MAT_DIALOG_DATA);

  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = inject(FormBuilder).group({
    vigenciaInicio:   ['', [Validators.required]],
    vigenciaFin:      [null as string | null],
    uitVigente:       [null as number | null, [Validators.required, Validators.min(0.01)]],
    fuenteOficial:    ['', [Validators.required]],
    observacion:      [null as string | null],
  });

  guardar(): void {
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.duplicarVigencia(this.data.row.id, {
      vigenciaInicio: v.vigenciaInicio!,
      vigenciaFin:    v.vigenciaFin || null,
      uitVigente:     Number(v.uitVigente),
      fuenteOficial:  v.fuenteOficial!,
      observacion:    v.observacion || null,
    }).subscribe({
      next:  () => { this.saving.set(false); this.dialogRef.close(true); },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Error al duplicar la vigencia.');
      },
    });
  }

  cancelar(): void { this.dialogRef.close(null); }
}
