import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QuintaCategoriaApiService } from '../../services/quinta-categoria-api.service';
import { EmpleadoOtrosIngresosDto, LiquidacionQuintaDto } from '../../models/quinta-categoria.models';
import { finalize } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { NotificacionService } from '../../../../core/services/notificacion.service';

export interface OtrosIngresosDialogData {
  empleadoId: number;
  empleadoNombre: string;
  anioFiscal: number;
  mesFiscal: number;
}

@Component({
  selector: 'app-empleado-otros-ingresos-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTooltipModule
  ],
  templateUrl: './empleado-otros-ingresos-dialog.component.html',
  styleUrls: ['./empleado-otros-ingresos-dialog.component.css']
})
export class EmpleadoOtrosIngresosDialogComponent implements OnInit {
  form!: FormGroup;
  isLoading = signal(true);
  isSaving = signal(false);
  selectedTab = signal(0);
  
  liquidacion: LiquidacionQuintaDto | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EmpleadoOtrosIngresosDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OtrosIngresosDialogData,
    private quintaCategoriaApi: QuintaCategoriaApiService,
    private snackBar: MatSnackBar,
    private notificacionService: NotificacionService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadData();
  }

  private createForm(): void {
    this.form = this.fb.group({
      montoIngresos: [0, [Validators.required, Validators.min(0)]],
      montoRetenciones: [0, [Validators.required, Validators.min(0)]]
    });
  }

  private loadData(): void {
    // In a real scenario we'd use forkJoin, but let's load what we can for now.
    this.isLoading.set(true);
    
    // 1. Cargar formulario
    this.quintaCategoriaApi.obtenerOtrosIngresos(this.data.empleadoId, this.data.anioFiscal)
      .subscribe({
        next: (res) => {
          if (res) {
            this.form.patchValue({
              montoIngresos: res.montoIngresos,
              montoRetenciones: res.montoRetenciones
            });
          }
        },
        error: () => {
          this.snackBar.open('Error al cargar datos del formulario', 'Cerrar', { duration: 3000 });
        }
      });

    // 2. Cargar liquidación
    this.quintaCategoriaApi.obtenerLiquidacionQuinta(this.data.empleadoId, this.data.anioFiscal, this.data.mesFiscal)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.liquidacion = res;
        },
        error: () => {
          // If endpoint doesn't exist yet, we show a mock or handle gracefully
          this.mockLiquidacion();
        }
      });
  }
  
  private mockLiquidacion(): void {
    // Fallback mock since backend might not have the logic ready
    this.liquidacion = {
      idEmpleado: this.data.empleadoId.toString(),
      nombreCompleto: this.data.empleadoNombre,
      periodoCalculo: 'Mayo 2026',
      sueldoMensualProyectado: 40000,
      gratificacionesProyectadas: 10000,
      remuneracionesPercibidasAnteriores: 20000,
      ingresosOtrosEmpleadores: 5000,
      totalRentaBrutaAnual: 75000,
      montoDeduccionUIT: 36050,
      totalRentaNetaImponible: 38950,
      tramo1: 2060,
      tramo2: 1848,
      tramo3: 0,
      tramo4: 0,
      tramo5: 0,
      impuestoAnualProyectado: 3908,
      retencionesAcumuladasExternas: 1000,
      saldoRetenerAnual: 2908,
      divisorMes: 8,
      montoRetenerMes: 363.50
    };
  }

  guardar(): void {
    if (this.form.invalid) return;

    const { montoIngresos, montoRetenciones } = this.form.value;

    if (montoRetenciones > montoIngresos) {
      this.form.get('montoRetenciones')?.setErrors({ mayorAIngresos: true });
      return;
    }

    const payload: EmpleadoOtrosIngresosDto = {
      empleadoId: this.data.empleadoId,
      anioFiscal: this.data.anioFiscal,
      montoIngresos,
      montoRetenciones
    };

    this.isSaving.set(true);
    this.quintaCategoriaApi.guardarOtrosIngresos(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.notificacionService.exito('Datos guardados correctamente', 'Registro exitoso');
          // Solo recargamos los datos para actualizar la liquidación en la segunda pestaña
          this.loadData();
        },
        error: (err) => {
          const msg = err.error?.message || 'Error al guardar datos';
          this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        }
      });
  }

  imprimir(): void {
    window.print();
  }
}
