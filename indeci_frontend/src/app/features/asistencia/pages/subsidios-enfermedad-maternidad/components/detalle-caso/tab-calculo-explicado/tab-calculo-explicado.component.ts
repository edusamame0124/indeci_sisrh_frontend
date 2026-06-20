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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../../core/models/error-response.model';
import { SubsidioApiService } from '../../../services/subsidio-api.service';
import type {
  SubsidioCasoResponse,
  SubsidioLiquidacionExplicacion,
  SubsidioLiquidacionResponse,
} from '../../../models/subsidio.models';
import {
  buildPasosCalculo,
  formatFechaSubsidio,
  formatSubsidioMonto,
  labelEstadoLiquidacion,
  tienePermisoSubsidio,
} from '../../../utils/subsidio-calculo-display.utils';

@Component({
  selector: 'app-subsidio-tab-calculo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tab-calculo-explicado.component.html',
  styleUrl: './tab-calculo-explicado.component.css',
})
export class TabCalculoExplicadoComponent {
  readonly caso = input.required<SubsidioCasoResponse>();
  readonly liquidacionCargada = output<SubsidioLiquidacionResponse | null>();

  private readonly api = inject(SubsidioApiService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tramoCtrl = new FormControl<number | null>(null);
  readonly loading = signal(false);
  readonly calculando = signal(false);
  readonly explicacion = signal<SubsidioLiquidacionExplicacion | null>(null);
  readonly liquidacion = signal<SubsidioLiquidacionResponse | null>(null);
  readonly columnas = ['orden', 'concepto', 'formula', 'valor'] as const;
  readonly formatMonto = formatSubsidioMonto;
  readonly formatFecha = formatFechaSubsidio;
  readonly labelEstado = labelEstadoLiquidacion;

  readonly tramos = computed(() => this.caso().tramos ?? []);

  readonly pasos = computed(() => {
    const exp = this.explicacion();
    return exp ? buildPasosCalculo(exp) : [];
  });

  readonly puedeCalcular = () => tienePermisoSubsidio(this.auth.permisos(), 'SUB_CALCULATE');

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
        if (id != null) this.cargarUltimaLiquidacion(id);
      });
  }

  calcular(): void {
    const tramoId = this.tramoCtrl.value;
    if (tramoId == null) return;
    this.calculando.set(true);
    this.api
      .calcularLiquidacion(tramoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (liq) => {
          this.calculando.set(false);
          this.liquidacion.set(liq);
          this.liquidacionCargada.emit(liq);
          this.cargarExplicacion(liq.id);
          this.snack.open('Liquidación calculada', 'Cerrar', { duration: 4000 });
        },
        error: (err: HttpErrorResponse) => {
          this.calculando.set(false);
          this.onError(err);
        },
      });
  }

  private cargarUltimaLiquidacion(tramoId: number): void {
    this.loading.set(true);
    this.api
      .historialLiquidaciones(tramoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (hist) => {
          const ultima = hist.length ? hist[hist.length - 1] : null;
          this.liquidacion.set(ultima);
          this.liquidacionCargada.emit(ultima);
          if (ultima) {
            this.cargarExplicacion(ultima.id);
          } else {
            this.explicacion.set(null);
            this.loading.set(false);
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.onError(err);
        },
      });
  }

  private cargarExplicacion(liquidacionId: number): void {
    this.loading.set(true);
    this.api
      .explicacionLiquidacion(liquidacionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (exp) => {
          this.explicacion.set(exp);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.onError(err);
        },
      });
  }

  private onError(err: HttpErrorResponse): void {
    const msg = isErrorResponse(err.error)
      ? this.errors.translate(err.error.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
