import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { PersonaPickerComponent } from '../../../../../empleados/components/persona-picker/persona-picker.component';
import { PersonaEmpleado } from '../../../../../empleados/models/persona-empleado.model';
import { CandidatoAdicionalDto } from '../../../../services/planilla-lote-api.service';

export interface GeneracionAdicionalManualResult {
  candidato: CandidatoAdicionalDto & { justificacionManual: string };
}

@Component({
  selector: 'app-generacion-adicional-manual-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    PersonaPickerComponent,
  ],
  templateUrl: './generacion-adicional-manual-dialog.component.html',
  styleUrl: './generacion-adicional-manual-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneracionAdicionalManualDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<GeneracionAdicionalManualDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly personaSeleccionada = signal<PersonaEmpleado | null>(null);

  readonly form = this.fb.nonNullable.group({
    motivoBase: ['OMISION', Validators.required],
    justificacion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
  });

  onPersonaSeleccionada(persona: PersonaEmpleado): void {
    this.personaSeleccionada.set(persona);
  }

  onLimpiarPersona(): void {
    this.personaSeleccionada.set(null);
  }

  confirmar(): void {
    if (this.form.invalid || !this.personaSeleccionada()?.empleadoId) {
      this.form.markAllAsTouched();
      return;
    }

    const persona = this.personaSeleccionada()!;
    const fv = this.form.getRawValue();

    const candidato = {
      empleadoId: persona.empleadoId!,
      dni: persona.dni,
      nombre: persona.nombreCompleto,
      regimenLaboral: 'N/A', 
      fechaIngreso: 'N/A', 
      motivo: 'INCLUSION_MANUAL',
      justificacionManual: `${fv.motivoBase} - ${fv.justificacion}`
    } as CandidatoAdicionalDto & { justificacionManual: string };

    this.dialogRef.close({ candidato });
  }
}
