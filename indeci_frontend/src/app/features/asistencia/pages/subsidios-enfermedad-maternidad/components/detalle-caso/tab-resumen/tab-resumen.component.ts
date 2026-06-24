import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../../../../core/models/error-response.model';
import { SubsidioApiService } from '../../../services/subsidio-api.service';
import type { SubsidioCasoResponse } from '../../../models/subsidio.models';
import {
  formatFechaSubsidio,
  formatPeriodoPlanillaLabel,
  iconoTipoCaso,
  labelEstadoCaso,
  labelTipoCaso,
  tienePermisoSubsidio,
} from '../../../utils/subsidio-calculo-display.utils';
import { periodoPlanillaDesdeCaso } from '../../../utils/subsidio-flujo.utils';

/** Estados donde aún se permite corregir las fechas del caso (antes de aplicar a planilla). */
const ESTADOS_EDITABLES = ['BORRADOR', 'PENDIENTE_VALIDACION', 'CALCULADO'];

@Component({
  selector: 'app-subsidio-tab-resumen',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tab-resumen.component.html',
  styleUrl: './tab-resumen.component.css',
})
export class TabResumenComponent {
  readonly caso = input.required<SubsidioCasoResponse>();
  readonly modo = input<'operativo' | 'completo'>('operativo');
  readonly mostrarPeriodo = input(true);
  readonly casoActualizado = output<SubsidioCasoResponse>();

  private readonly api = inject(SubsidioApiService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly notif = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly labelTipo = labelTipoCaso;
  readonly labelEstado = labelEstadoCaso;
  readonly formatFecha = formatFechaSubsidio;
  readonly iconoTipo = iconoTipoCaso;

  readonly periodoRaw = computed(() => periodoPlanillaDesdeCaso(this.caso()));
  readonly periodoLabel = computed(() => formatPeriodoPlanillaLabel(this.periodoRaw()));

  // ── Edición de fechas del descanso ─────────────────────────────────────────
  readonly editando = signal(false);
  readonly guardando = signal(false);
  readonly fInicio = signal('');
  readonly fFin = signal('');
  readonly fContingencia = signal('');

  readonly puedeEditar = computed(
    () =>
      ESTADOS_EDITABLES.includes(this.caso().estado) &&
      tienePermisoSubsidio(this.auth.permisos(), 'SUB_WRITE'),
  );

  iniciarEdicion(): void {
    const c = this.caso();
    this.fInicio.set(c.fechaInicio ?? '');
    this.fFin.set(c.fechaFin ?? '');
    this.fContingencia.set(c.fechaContingencia ?? c.fechaInicio ?? '');
    this.editando.set(true);
  }

  cancelarEdicion(): void {
    this.editando.set(false);
  }

  guardar(): void {
    const c = this.caso();
    const inicio = this.fInicio();
    const fin = this.fFin();
    const contingencia = this.fContingencia() || inicio;
    if (!inicio || !fin) {
      this.snack.open('Inicio y fin del descanso son obligatorios.', 'Cerrar', { duration: 4000 });
      return;
    }
    if (fin < inicio) {
      this.snack.open('La fecha fin no puede ser anterior al inicio.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.guardando.set(true);
    this.api
      .actualizarCaso(c.id, {
        empleadoId: c.empleadoId,
        tipoCaso: c.tipoCaso,
        fechaContingencia: contingencia,
        fechaInicio: inicio,
        fechaFin: fin,
        observacion: c.observacion,
        modoCalculo: c.modoCalculo,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.guardando.set(false);
          this.editando.set(false);
          this.notif.exito('Fechas del descanso actualizadas.');
          this.casoActualizado.emit(res);
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
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
