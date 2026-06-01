import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { RecalculoAsistenteApiService } from '../../services/recalculo-asistente-api.service';
import type {
  RecalculoCriterioRequest,
  RecalculoCriterioTipo,
  RecalculoPreviewResponse,
  RecalculoResultadoResponse,
} from '../../models/recalculo.model';

type FaseWizard = 'idle' | 'cargando-preview' | 'preview-listo' | 'ejecutando' | 'completado';

/**
 * F3.4 — Asistente de Recálculo.
 *
 * <p>Wizard guiado de 3 pasos:</p>
 * <ol>
 *   <li><strong>Alcance</strong>: período + criterio.</li>
 *   <li><strong>Previsión</strong>: lista de empleados afectados (dry-run).</li>
 *   <li><strong>Ejecutar</strong>: dispara el motor por cada empleado y muestra
 *       el delta vs cálculo anterior.</li>
 * </ol>
 *
 * <p>Ruta: {@code /planilla/recalculo}.</p>
 */
@Component({
  selector: 'app-recalculo-wizard-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    MatStepperModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recalculo-wizard-page.component.html',
  styleUrl: './recalculo-wizard-page.component.css',
})
export class RecalculoWizardPageComponent {
  private readonly api = inject(RecalculoAsistenteApiService);
  private readonly dialog = inject(MatDialog);
  private readonly errors = inject(ErrorMessageService);

  readonly stepper = viewChild<MatStepper>('stepper');

  // ===================== Periodo sugerido =====================

  private static periodoActual(): string {
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = (ahora.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
  }

  // ===================== State =====================

  /** Paso 1 — alcance. */
  readonly paso1 = new FormGroup({
    periodo: new FormControl<string>(RecalculoWizardPageComponent.periodoActual(), {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)],
    }),
    tipo: new FormControl<RecalculoCriterioTipo>('TODOS', { nonNullable: true }),
    regimen: new FormControl<string>('728', { nonNullable: true }),
    listaIdsTexto: new FormControl<string>('', { nonNullable: true }),
  });

  readonly regimenesDisponibles = ['276', '728', 'CAS', 'SERVIR'] as const;

  readonly fase = signal<FaseWizard>('idle');
  readonly errorMsg = signal<string | null>(null);
  readonly preview = signal<RecalculoPreviewResponse | null>(null);
  readonly resultado = signal<RecalculoResultadoResponse | null>(null);

  readonly columnasPreview = ['empleado', 'regimen', 'netoActual', 'estado'] as const;
  readonly columnasResultado = [
    'empleado',
    'status',
    'netoAnterior',
    'netoNuevo',
    'delta',
    'razon',
  ] as const;

  // ===================== Computed =====================

  readonly criterioActual = computed<RecalculoCriterioRequest>(() => {
    const tipo = this.paso1.controls.tipo.value;
    const valorString =
      tipo === 'REGIMEN_LABORAL' ? this.paso1.controls.regimen.value : null;
    const valorListaIds =
      tipo === 'EMPLEADOS_LISTA' ? this.parsearListaIds() : null;
    return { tipo, valorString, valorListaIds };
  });

  readonly canIrPaso2 = computed(() => this.paso1.valid);

  // ===================== Acciones =====================

  /** Carga preview y avanza al paso 2. */
  cargarPreview(): void {
    if (!this.paso1.valid) return;
    const periodo = this.paso1.controls.periodo.value;
    const criterio = this.criterioActual();

    if (criterio.tipo === 'EMPLEADOS_LISTA' && (criterio.valorListaIds?.length ?? 0) === 0) {
      this.errorMsg.set('Ingresa al menos un ID de empleado en la lista.');
      return;
    }

    this.errorMsg.set(null);
    this.fase.set('cargando-preview');
    this.preview.set(null);
    this.resultado.set(null);

    this.api.preview(periodo, criterio).subscribe({
      next: (r) => {
        this.preview.set(r);
        this.fase.set('preview-listo');
        // Avanza al paso 2 automáticamente.
        const s = this.stepper();
        if (s) s.next();
      },
      error: (err) => this.manejarError(err),
    });
  }

  /** Pide confirmación y luego ejecuta el recálculo. */
  confirmarEjecutar(): void {
    const pre = this.preview();
    if (!pre || pre.total === 0) return;
    const ref = this.dialog.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: `Recalcular planilla — ${pre.periodo}`,
        message:
          `Se recalculará la planilla de ${pre.total} empleado(s) del período ${pre.periodo}. ` +
          'Esta acción sobrescribirá los movimientos previos. ¿Continuar?',
        confirmLabel: 'Ejecutar recálculo',
        cancelLabel: 'Cancelar',
        severity: 'warning',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.ejecutar();
    });
  }

  /** Disparador real (público como test seam). */
  ejecutar(): void {
    const periodo = this.paso1.controls.periodo.value;
    const criterio = this.criterioActual();
    this.fase.set('ejecutando');
    this.errorMsg.set(null);

    this.api.ejecutar(periodo, criterio).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.fase.set('completado');
        const s = this.stepper();
        if (s) s.next();
      },
      error: (err) => this.manejarError(err),
    });
  }

  /** Vuelve al paso 1 limpio. */
  reiniciar(): void {
    this.preview.set(null);
    this.resultado.set(null);
    this.fase.set('idle');
    this.errorMsg.set(null);
    const s = this.stepper();
    if (s) s.reset();
  }

  // ===================== Helpers =====================

  /** Parsea el textarea de IDs (coma o salto de línea). */
  private parsearListaIds(): number[] {
    const raw = this.paso1.controls.listaIdsTexto.value ?? '';
    return raw
      .split(/[\s,]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  private manejarError(err: HttpErrorResponse): void {
    this.fase.set('idle');
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.errorMsg.set(msg);
  }

  // ===================== Presentación =====================

  fmtMonto(v: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v ?? 0);
  }

  /** "+ S/ 200.00" / "− S/ 50.00" / "S/ 0.00". Sin colorear: el chip lo hace. */
  fmtDelta(v: number | null | undefined): string {
    if (v == null) return '—';
    const abs = Math.abs(v);
    const signo = v > 0 ? '+' : v < 0 ? '−' : '';
    return `${signo} S/ ${this.fmtMonto(abs)}`;
  }

  /** Etiqueta legible del criterio (sin tocar el value). */
  labelCriterio(tipo: RecalculoCriterioTipo): string {
    switch (tipo) {
      case 'TODOS':                    return 'Todos los empleados activos';
      case 'REGIMEN_LABORAL':          return 'Por régimen laboral';
      case 'EMPLEADOS_LISTA':          return 'Lista manual de empleados';
      case 'CON_PREFLIGHT_PENDIENTE':  return 'Con hallazgos pendientes (preflight)';
    }
  }
}
