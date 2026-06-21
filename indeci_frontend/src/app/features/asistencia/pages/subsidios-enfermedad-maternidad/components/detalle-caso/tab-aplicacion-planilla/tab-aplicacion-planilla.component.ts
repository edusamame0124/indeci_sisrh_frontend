import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../../core/models/error-response.model';
import { ConfirmDialogComponent } from '../../../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SubsidioMotivoDialogComponent } from '../subsidio-motivo-dialog.component';
import { SubsidioApiService } from '../../../services/subsidio-api.service';
import type { SubsidioCasoResponse, SubsidioLiquidacionResponse } from '../../../models/subsidio.models';
import {
  formatSubsidioMonto,
  labelEstadoLiquidacion,
  tienePermisoSubsidio,
} from '../../../utils/subsidio-calculo-display.utils';

@Component({
  selector: 'app-subsidio-tab-planilla',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tab-aplicacion-planilla.component.html',
  styleUrl: './tab-aplicacion-planilla.component.css',
})
export class TabAplicacionPlanillaComponent {
  readonly caso = input.required<SubsidioCasoResponse>();
  readonly motivosBloqueo = input<readonly string[]>([]);
  readonly casoActualizado = output<SubsidioCasoResponse>();
  readonly liquidacionCargada = output<SubsidioLiquidacionResponse | null>();

  private readonly api = inject(SubsidioApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tramoCtrl = new FormControl<number | null>(null);
  readonly loading = signal(false);
  readonly procesando = signal(false);
  readonly liquidaciones = signal<readonly SubsidioLiquidacionResponse[]>([]);
  readonly columnas = ['version', 'estado', 'essalud', 'diff', 'acciones'] as const;
  readonly formatMonto = formatSubsidioMonto;
  readonly labelEstado = labelEstadoLiquidacion;

  readonly tramos = computed(() => this.caso().tramos ?? []);

  readonly ultimaLiquidacion = computed(() => {
    const rows = this.liquidaciones();
    return rows.length ? rows[rows.length - 1] : null;
  });

  readonly puedeAplicar = () => tienePermisoSubsidio(this.auth.permisos(), 'SUB_APPLY_PLANILLA');
  readonly puedeAjustar = () => tienePermisoSubsidio(this.auth.permisos(), 'SUB_ADJUST');

  constructor() {
    effect(() => {
      const tramos = this.tramos();
      if (tramos.length > 0 && this.tramoCtrl.value == null) {
        this.tramoCtrl.setValue(tramos[0].id, { emitEvent: true });
      }
    });
    this.tramoCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        if (id != null) this.cargarLiquidaciones(id);
      });
  }

  aplicar(liq: SubsidioLiquidacionResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Aplicar a planilla',
        message: `¿Aplicar la liquidación v${liq.versionLiq} al movimiento de planilla? Esta acción imputa conceptos de subsidio.`,
        confirmLabel: 'Aplicar',
        cancelLabel: 'Cancelar',
        severity: 'warning',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.procesando.set(true);
      this.api.aplicarPlanilla(liq.id).subscribe({
        next: () => {
          this.procesando.set(false);
          this.snack.open('Liquidación aplicada a planilla', 'Cerrar', { duration: 4000 });
          const tramoId = this.tramoCtrl.value;
          if (tramoId != null) this.cargarLiquidaciones(tramoId);
          this.refrescarCaso();
        },
        error: (err) => {
          this.procesando.set(false);
          this.onError(err);
        },
      });
    });
  }

  revertir(liq: SubsidioLiquidacionResponse): void {
    const ref = this.dialog.open(SubsidioMotivoDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((motivo: string | null) => {
      if (!motivo) return;
      this.procesando.set(true);
      this.api.revertirPlanilla(liq.id, motivo).subscribe({
        next: () => {
          this.procesando.set(false);
          this.snack.open('Liquidación revertida', 'Cerrar', { duration: 4000 });
          const tramoId = this.tramoCtrl.value;
          if (tramoId != null) this.cargarLiquidaciones(tramoId);
          this.refrescarCaso();
        },
        error: (err) => {
          this.procesando.set(false);
          this.onError(err);
        },
      });
    });
  }

  private cargarLiquidaciones(tramoId: number): void {
    this.loading.set(true);
    this.api
      .historialLiquidaciones(tramoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.liquidaciones.set(rows);
          const ultima = rows.length ? rows[rows.length - 1] : null;
          this.liquidacionCargada.emit(ultima);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.onError(err);
        },
      });
  }

  private refrescarCaso(): void {
    this.api.obtenerCaso(this.caso().id).subscribe({
      next: (c) => this.casoActualizado.emit(c),
    });
  }

  private onError(err: HttpErrorResponse): void {
    const msg = isErrorResponse(err.error)
      ? this.errors.translate(err.error.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
