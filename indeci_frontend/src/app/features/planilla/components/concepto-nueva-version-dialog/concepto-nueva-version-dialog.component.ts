import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/** Datos de apertura del diálogo "Crear nueva versión vigente". */
export interface ConceptoNuevaVersionDialogData {
  /** Código del concepto (solo display). */
  readonly codigo: string;
  /** Nombre del concepto (solo display). */
  readonly nombre: string;
  /** Versión vigente actual (solo display, opcional). */
  readonly versionActual?: number | null;
}

/** Convierte Date del datepicker a "yyyy-MM-dd" para el backend. */
function toIsoDate(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Diálogo "Crear nueva versión vigente" (P3 — SPEC_CONCEPTOS_PLANILLA §12 · D5).
 *
 * <p>Pide la fecha de inicio de vigencia de la nueva versión. Se usa cuando el
 * concepto ya fue usado en planilla cerrada: no se edita, se versiona hacia
 * adelante (D5). La nueva versión nace en BORRADOR.</p>
 *
 * <p>Devuelve la fecha en formato ISO `yyyy-MM-dd`; la página orquesta el POST,
 * el toast verde y el manejo del 400 (solapamiento de vigencias).</p>
 */
@Component({
  selector: 'app-concepto-nueva-version-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './concepto-nueva-version-dialog.component.html',
  styleUrl: './concepto-nueva-version-dialog.component.css',
})
export class ConceptoNuevaVersionDialogComponent {
  readonly data: ConceptoNuevaVersionDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<ConceptoNuevaVersionDialogComponent, string | undefined>,
  );
  private readonly fb = inject(FormBuilder);

  readonly minDate = new Date(2000, 0, 1);
  readonly maxDate = new Date(2100, 11, 31);

  readonly form = this.fb.group({
    fechaVigIni: this.fb.control<Date | null>(null, {
      validators: [Validators.required],
    }),
  });

  private readonly status = toSignal(this.form.statusChanges, {
    initialValue: this.form.status,
  });

  readonly puedeGuardar = computed(() => this.status() === 'VALID');

  confirmar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const iso = toIsoDate(this.form.controls.fechaVigIni.value);
    if (!iso) return;
    this.dialogRef.close(iso);
  }

  cancelar(): void {
    this.dialogRef.close(undefined);
  }
}
