import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { readApiErrorMessage } from '../../../../core/models/error-response.model';
import { ImportVinculacionApiService } from '../../services/import-vinculacion-api.service';
import type {
  ImportCommit,
  ImportEstadoFila,
  ImportFilaPreview,
  ImportPreview,
} from '../../models/import-vinculacion.model';

/** Resultado que el diálogo devuelve al cerrarse: informa si hubo altas para refrescar la lista. */
export interface ImportVinculacionDialogResult {
  readonly importado: boolean;
}

type FiltroEstado = 'TODOS' | ImportEstadoFila;

/**
 * Modal de Import de Vinculación (Registro Integrado de Personal).
 *
 * Flujo de 3 pasos (mat-stepper lineal), consistente con el import de asistencia:
 *  1. Cargar   — adjuntar el .xlsx oficial.
 *  2. Revisar  — previsualización fila por fila (no escribe nada); RR.HH. corrige y re-sube.
 *  3. Confirmar — importa solo las filas válidas y muestra el resumen.
 *
 * Los datos importados se reflejan de inmediato en "Datos del empleado" y "Editar persona"
 * porque el import escribe en las mismas entidades que esas pantallas leen.
 */
@Component({
  selector: 'app-import-vinculacion-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatButtonToggleModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-vinculacion-dialog.component.html',
  styleUrl: './import-vinculacion-dialog.component.css',
})
export class ImportVinculacionDialogComponent {
  private readonly api = inject(ImportVinculacionApiService);
  private readonly errores = inject(ErrorMessageService);
  private readonly dialogRef =
    inject<MatDialogRef<ImportVinculacionDialogComponent, ImportVinculacionDialogResult>>(MatDialogRef);

  private readonly stepper = viewChild.required(MatStepper);

  /** Columnas de la tabla de previsualización. */
  readonly columnas = ['fila', 'dni', 'nombre', 'estado', 'detalle'] as const;
  /** Columnas de la tabla de filas omitidas (paso Confirmar). */
  readonly columnasError = ['fila', 'dni', 'nombre', 'motivo'] as const;

  readonly archivo = signal<File | null>(null);
  readonly procesando = signal(false);
  readonly errorMensaje = signal<string | null>(null);

  readonly preview = signal<ImportPreview | null>(null);
  readonly commit = signal<ImportCommit | null>(null);
  readonly filtro = signal<FiltroEstado>('TODOS');

  /** El commit solo se habilita si la preview trajo al menos una fila importable. */
  readonly puedeImportar = computed(() => (this.preview()?.importables ?? 0) > 0);

  readonly filasFiltradas = computed<readonly ImportFilaPreview[]>(() => {
    const filas = this.preview()?.filas ?? [];
    const f = this.filtro();
    return f === 'TODOS' ? filas : filas.filter((fila) => fila.estado === f);
  });

  // ---- Paso 1: selección de archivo
  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.errorMensaje.set(null);
    if (file && !file.name.toLowerCase().endsWith('.xlsx')) {
      this.errorMensaje.set('El archivo debe ser una plantilla Excel (.xlsx).');
      this.archivo.set(null);
      return;
    }
    this.archivo.set(file);
  }

  quitarArchivo(): void {
    this.archivo.set(null);
    this.preview.set(null);
    this.errorMensaje.set(null);
  }

  // ---- Paso 1 → 2: previsualizar (no escribe nada)
  previsualizar(): void {
    const file = this.archivo();
    if (!file) {
      return;
    }
    this.procesando.set(true);
    this.errorMensaje.set(null);
    this.api.previsualizar(file).subscribe({
      next: (resultado) => {
        this.preview.set(resultado);
        this.procesando.set(false);
        this.stepper().next();
      },
      error: (err: HttpErrorResponse) => this.fallo(err),
    });
  }

  // ---- Paso 2 → 3: importar solo las filas válidas
  importar(): void {
    const file = this.archivo();
    if (!file || !this.puedeImportar()) {
      return;
    }
    this.procesando.set(true);
    this.errorMensaje.set(null);
    this.api.importar(file).subscribe({
      next: (resultado) => {
        this.commit.set(resultado);
        this.procesando.set(false);
        // El paso "Confirmar" es el feedback de éxito (creados/actualizados/omitidos). No se
        // abre un toast aquí: hacerlo mientras el modal sigue montado dispara el
        // HierarchyRequestError del overlay CDK. El toast lo emite la lista al cerrarse.
        this.stepper().next();
      },
      error: (err: HttpErrorResponse) => this.fallo(err),
    });
  }

  /** Reinicia el flujo para una nueva carga sin cerrar el modal. */
  nuevaCarga(): void {
    this.archivo.set(null);
    this.preview.set(null);
    this.commit.set(null);
    this.filtro.set('TODOS');
    this.errorMensaje.set(null);
    this.stepper().reset();
  }

  cerrar(): void {
    this.dialogRef.close({ importado: this.commit() !== null });
  }

  filtrar(estado: FiltroEstado): void {
    this.filtro.set(estado);
  }

  private fallo(err: HttpErrorResponse): void {
    this.procesando.set(false);
    this.errorMensaje.set(this.errores.translate(readApiErrorMessage(err.error)));
  }
}
