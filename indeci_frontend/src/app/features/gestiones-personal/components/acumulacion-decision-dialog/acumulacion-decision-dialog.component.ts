import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PadronVacacionalApiService } from '../../services/padron-vacacional-api.service';
import { AcumulacionDecisionDto, PadronVacacionalRowDto } from '../../models/padron-vacacional.model';

@Component({
  selector: 'app-acumulacion-decision-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './acumulacion-decision-dialog.component.html',
  styleUrl: './acumulacion-decision-dialog.component.css'
})
export class AcumulacionDecisionDialogComponent implements OnInit {
  readonly data = inject<PadronVacacionalRowDto>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<AcumulacionDecisionDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(PadronVacacionalApiService);
  private readonly datePipe = inject(DatePipe);

  cargandoHistorial = signal(false);
  historial = signal<AcumulacionDecisionDto[]>([]);

  readonly form = this.fb.group({
    motivoDecision: ['', Validators.required],
    documentoSustento: ['']
  });

  ngOnInit(): void {
    this.cargandoHistorial.set(true);
    this.apiService.listarDecisionesAcumulacion(this.data.empleadoId).subscribe({
      next: (resp) => {
        this.historial.set(resp.data ?? []);
        this.cargandoHistorial.set(false);
      },
      error: () => this.cargandoHistorial.set(false)
    });
  }

  formatearFecha(fecha: string): string {
    return this.datePipe.transform(fecha, 'dd/MM/yyyy HH:mm') ?? fecha;
  }

  guardar(): void {
    if (this.form.valid) {
      this.dialogRef.close({
        motivoDecision: this.form.value.motivoDecision,
        documentoSustento: this.form.value.documentoSustento || null
      });
    }
  }
}
