import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PersonaPickerComponent } from '../../../../../empleados/components/persona-picker/persona-picker.component';
import { PersonaEmpleado } from '../../../../../empleados/models/persona-empleado.model';
import { CandidatoAdicionalDto } from '../../../../services/planilla-lote-api.service';
import { EmpleadoPlanillaApiService } from '../../../../../empleados/services/empleado-planilla-api.service';
import { EmpleadoPlanillaRow } from '../../../../../empleados/models/empleado-planilla.model';

export interface GeneracionAdicionalManualData {
  regimenSeleccionado: string | null;
}

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
    MatProgressSpinnerModule,
    PersonaPickerComponent,
  ],
  templateUrl: './generacion-adicional-manual-dialog.component.html',
  styleUrl: './generacion-adicional-manual-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneracionAdicionalManualDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<GeneracionAdicionalManualDialogComponent>);
  private readonly data = inject<GeneracionAdicionalManualData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly planillaApi = inject(EmpleadoPlanillaApiService);

  readonly personaSeleccionada = signal<PersonaEmpleado | null>(null);
  readonly vinculoActivo = signal<EmpleadoPlanillaRow | null>(null);
  readonly loadingVinculo = signal(false);
  readonly errorRegimen = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    motivoBase: ['OMISION', Validators.required],
    justificacion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
  });

  onPersonaSeleccionada(persona: PersonaEmpleado): void {
    this.personaSeleccionada.set(persona);
    this.vinculoActivo.set(null);
    this.errorRegimen.set(null);

    if (!persona.empleadoId) {
      this.errorRegimen.set('La persona seleccionada no tiene un registro de empleado válido.');
      return;
    }

    this.loadingVinculo.set(true);
    this.planillaApi.listar(persona.empleadoId).subscribe({
      next: (rows) => {
        this.loadingVinculo.set(false);
        const activo = rows.find(r => r.activo === 1);
        if (!activo) {
          this.errorRegimen.set('El empleado no tiene un vínculo laboral activo.');
          return;
        }

        if (this.data.regimenSeleccionado && activo.regimenLaboral !== this.data.regimenSeleccionado) {
          this.errorRegimen.set(`El empleado no puede ser incluido porque pertenece al régimen laboral ${activo.regimenLaboral || 'Desconocido'} y esta planilla es del régimen ${this.data.regimenSeleccionado}.`);
          return;
        }

        this.vinculoActivo.set(activo);
      },
      error: () => {
        this.loadingVinculo.set(false);
        this.errorRegimen.set('Error al verificar el vínculo laboral del empleado.');
      }
    });
  }

  onLimpiarPersona(): void {
    this.personaSeleccionada.set(null);
    this.vinculoActivo.set(null);
    this.errorRegimen.set(null);
  }

  confirmar(): void {
    const vinculo = this.vinculoActivo();
    if (this.form.invalid || !this.personaSeleccionada()?.empleadoId || !vinculo || this.errorRegimen()) {
      this.form.markAllAsTouched();
      return;
    }

    const persona = this.personaSeleccionada()!;
    const fv = this.form.getRawValue();

    const candidato = {
      empleadoId: persona.empleadoId!,
      dni: persona.dni,
      nombre: persona.nombreCompleto,
      regimenLaboral: vinculo.regimenLaboral || 'N/A', 
      fechaIngreso: vinculo.fechaInicioContrato || 'N/A', 
      motivo: 'INCLUSION_MANUAL',
      justificacionManual: `${fv.motivoBase} - ${fv.justificacion}`,
      tipoContratoId: vinculo.tipoContratoId,
      condicionLaboralId: vinculo.condicionLaboralId,
      modalidadCasId: vinculo.modalidadCasId
    } as CandidatoAdicionalDto & { justificacionManual: string };

    this.dialogRef.close({ candidato });
  }
}
