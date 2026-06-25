import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ConceptoPlanillaApiService } from '../../services/concepto-planilla-api.service';
import type {
  ConceptoAuditoriaItem,
  ConceptoVersionItem,
} from '../../models/concepto-historial.model';
import type { ConceptoPlanillaEstado } from '../../models/concepto-planilla.model';

/** Datos de apertura del diálogo Historial / Versiones. */
export interface ConceptoHistorialDialogData {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
}

type Severity = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

/**
 * Diálogo "Historial / Versiones" (P3 — SPEC_CONCEPTOS_PLANILLA §12 · D5).
 *
 * <p>Sólo lectura: línea de tiempo de versiones por código (n.º, rango de
 * vigencia, estado, badge "Vigente") + log de auditoría (@Auditable) en orden
 * descendente. Carga su propia data desde
 * {@link ConceptoPlanillaApiService.historial}.</p>
 */
@Component({
  selector: 'app-concepto-historial-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './concepto-historial-dialog.component.html',
  styleUrl: './concepto-historial-dialog.component.css',
})
export class ConceptoHistorialDialogComponent {
  readonly data: ConceptoHistorialDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<ConceptoHistorialDialogComponent>,
  );
  private readonly api = inject(ConceptoPlanillaApiService);
  private readonly errors = inject(ErrorMessageService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly versiones = signal<readonly ConceptoVersionItem[]>([]);
  readonly auditoria = signal<readonly ConceptoAuditoriaItem[]>([]);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.historial(this.data.id).subscribe({
      next: (h) => {
        this.versiones.set(h.versiones ?? []);
        this.auditoria.set(h.auditoria ?? []);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.versiones.set([]);
        this.auditoria.set([]);
        this.loadError.set(this.resolveError(e));
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  /** Rango de vigencia legible para una versión. */
  rangoVigencia(v: ConceptoVersionItem): string {
    const ini = v.vigIni ?? '—';
    const fin = v.vigFin ?? 'vigente';
    return `${ini} → ${fin}`;
  }

  labelEstado(e: ConceptoPlanillaEstado | string): string {
    switch (e) {
      case 'BORRADOR': return 'Borrador';
      case 'EN_REVISION': return 'En revisión';
      case 'ACTIVO': return 'Activo';
      case 'CERRADO': return 'Cerrado';
      case 'ANULADO': return 'Anulado';
      default: return e;
    }
  }

  severityEstado(e: ConceptoPlanillaEstado | string): Severity {
    switch (e) {
      case 'ACTIVO': return 'success';
      case 'EN_REVISION': return 'info';
      case 'BORRADOR': return 'warning';
      case 'ANULADO': return 'danger';
      case 'CERRADO': return 'neutral';
      default: return 'neutral';
    }
  }

  private resolveError(err: unknown): string {
    if (err instanceof HttpErrorResponse && isErrorResponse(err.error)) {
      return this.errors.translate(err.error.mensaje);
    }
    return this.errors.translate(null);
  }
}
