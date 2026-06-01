import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { PersonaPickerComponent } from '../../components/persona-picker/persona-picker.component';
import { EncargaturaApiService } from '../../services/encargatura-api.service';
import type {
  EncargaturaRequest,
  EncargaturaResponse,
} from '../../models/encargatura.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

/** Datos del dialog. Si trae {@code editar}, el modal entra en modo edición. */
export interface EncargaturaDialogData {
  readonly editar?: EncargaturaResponse | null;
}

/**
 * F5.2 — Modal para registrar / editar una encargatura.
 *
 * <p>Usa {@link PersonaPickerComponent} dos veces (titular + encargado) para
 * forzar la selección con autocomplete. Bloquea submit hasta que ambas
 * personas estén seleccionadas, distintas entre sí, y la fecha de inicio
 * esté presente. La fecha de fin es opcional (encargatura indefinida).</p>
 */
@Component({
  selector: 'app-encargatura-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PersonaPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './encargatura-form-dialog.component.html',
  styleUrl: './encargatura-form-dialog.component.css',
})
export class EncargaturaFormDialogComponent {
  private readonly api = inject(EncargaturaApiService);
  private readonly errors = inject(ErrorMessageService);

  readonly titular = signal<PersonaEmpleado | null>(null);
  readonly encargado = signal<PersonaEmpleado | null>(null);
  readonly enviando = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = new FormGroup({
    fechaInicio: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    fechaFin: new FormControl<string>('', { nonNullable: true }),
    resolucion: new FormControl<string>('', { nonNullable: true }),
  });

  readonly esEdicion = computed(() => !!this.data?.editar);

  readonly puedeGuardar = computed(() => {
    const t = this.titular();
    const e = this.encargado();
    if (!t?.empleadoId || !e?.empleadoId) return false;
    if (t.empleadoId === e.empleadoId) return false;
    if (!this.form.controls.fechaInicio.value) return false;
    return !this.enviando();
  });

  constructor(
    private readonly dialogRef: MatDialogRef<EncargaturaFormDialogComponent, EncargaturaResponse | undefined>,
    @Inject(MAT_DIALOG_DATA) public readonly data: EncargaturaDialogData,
  ) {
    if (this.data?.editar) {
      const e = this.data.editar;
      this.form.patchValue({
        fechaInicio: e.fechaInicio ?? '',
        fechaFin: e.fechaFin ?? '',
        resolucion: e.resolucion ?? '',
      });
      // Inicializar las personas con un esqueleto que respeta el contrato del
      // PersonaPicker. Solo se usan para mostrar el chip — el id es lo crítico.
      this.titular.set({
        id: e.empleadoTitularId,
        empleadoId: e.empleadoTitularId,
        nombreCompleto: e.titularNombre ?? `Empleado ${e.empleadoTitularId}`,
        dni: e.titularDni ?? '',
        email: '',
      });
      this.encargado.set({
        id: e.empleadoEncargId,
        empleadoId: e.empleadoEncargId,
        nombreCompleto: e.encargadoNombre ?? `Empleado ${e.empleadoEncargId}`,
        dni: e.encargadoDni ?? '',
        email: '',
      });
    }
  }

  // ===================== Acciones =====================

  onTitular(p: PersonaEmpleado): void {
    this.titular.set(p);
    this.recalcularError();
  }

  onLimpiarTitular(): void {
    this.titular.set(null);
  }

  onEncargado(p: PersonaEmpleado): void {
    this.encargado.set(p);
    this.recalcularError();
  }

  onLimpiarEncargado(): void {
    this.encargado.set(null);
  }

  guardar(): void {
    if (!this.puedeGuardar()) return;
    const body: EncargaturaRequest = {
      empleadoTitularId: this.titular()!.empleadoId!,
      empleadoEncargId: this.encargado()!.empleadoId!,
      fechaInicio: this.form.controls.fechaInicio.value,
      fechaFin: this.form.controls.fechaFin.value || null,
      resolucion: this.form.controls.resolucion.value || null,
    };

    this.enviando.set(true);
    this.errorMsg.set(null);

    const editar = this.data?.editar;
    const op$ = editar
      ? this.api.actualizar(editar.id, body)
      : this.api.crear(body);

    op$.subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.dialogRef.close(r);
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        const body2 = err.error;
        this.errorMsg.set(
          isErrorResponse(body2)
            ? this.errors.translate(body2.mensaje)
            : this.errors.translate(null),
        );
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(undefined);
  }

  // ===================== Helpers =====================

  private recalcularError(): void {
    const t = this.titular();
    const e = this.encargado();
    if (t?.empleadoId && e?.empleadoId && t.empleadoId === e.empleadoId) {
      this.errorMsg.set('El titular y el encargado deben ser personas distintas.');
    } else if (this.errorMsg() === 'El titular y el encargado deben ser personas distintas.') {
      this.errorMsg.set(null);
    }
  }
}
