import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Suspension4taApiService } from '../../../../services/suspension4ta-api.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import type {
  EstadoControlIr4ta,
  Ir4taControlAnual,
  TipoTopeIr4ta,
} from '../../../../models/ir4ta-control-anual.model';

/**
 * Wireframe B — pestaña "Control anual" del tope de suspensión IR4ta.
 *
 * Solo lectura de los montos calculados (acumulado conocido por INDECI, tope,
 * saldo, % consumido) + flag manual de tipo de tope (RR.HH.) + confirmación de
 * reinicio cuando el control excede el tope. No calcula nada en el front: el
 * acumulado y el estado provienen del backend.
 */
@Component({
  selector: 'app-control-anual-tab',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './control-anual-tab.component.html',
  styleUrl: './control-anual-tab.component.css',
})
export class ControlAnualTabComponent {
  private readonly api = inject(Suspension4taApiService);
  private readonly fb = inject(FormBuilder);
  private readonly notif = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);
  private readonly snack = inject(MatSnackBar);

  /** Empleado cuyo control se muestra. Dispara la carga al cambiar. */
  readonly empleadoId = input.required<number>();

  readonly anios = this.construirAnios();
  readonly anio = signal(new Date().getFullYear());

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly control = signal<Ir4taControlAnual | null>(null);
  readonly saving = signal(false);

  /** Form de confirmación de reinicio (solo visible en estado EXCEDE). */
  readonly form = this.fb.nonNullable.group({
    periodoReinicio: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]],
    sustento: ['', [Validators.required, Validators.maxLength(1000)]],
    observacion: [''],
  });

  /** Ancho de la barra de progreso, acotado a 0–100. */
  readonly pctBar = computed(() => {
    const pct = this.control()?.pctConsumido ?? 0;
    return Math.max(0, Math.min(100, pct));
  });

  readonly requiereValidacion = computed(
    () => this.control()?.estadoControl === 'EXCEDE_TOPE_REQUIERE_VALIDACION',
  );

  readonly reinicioConfirmado = computed(() => {
    const c = this.control();
    return c?.estadoControl === 'RETENCION_ACTIVA' && c?.periodoReinicio != null;
  });

  constructor() {
    // Carga (re)activa al cambiar empleado o año fiscal seleccionado.
    effect(() => {
      const eid = this.empleadoId();
      const anio = this.anio();
      if (eid) this.fetch(eid, anio);
    });
  }

  cambiarAnio(anio: number): void {
    this.anio.set(anio); // el effect recarga
  }

  /** Reintento manual (botón de error). */
  cargar(): void {
    const eid = this.empleadoId();
    if (eid) this.fetch(eid, this.anio());
  }

  private fetch(eid: number, anio: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.controlAnual(eid, anio).subscribe({
      next: (c) => {
        this.control.set(c);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.control.set(null);
        this.error.set(this.traducir(err));
      },
    });
  }

  cambiarTipoTope(tipo: TipoTopeIr4ta): void {
    const eid = this.empleadoId();
    if (!eid || this.saving()) return;
    this.saving.set(true);
    this.api.definirTipoTope(eid, this.anio(), tipo).subscribe({
      next: (c) => {
        this.control.set(c);
        this.saving.set(false);
        this.notif.exito('Tipo de tope actualizado.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.snack.open(this.traducir(err), 'Cerrar', { duration: 7000 });
      },
    });
  }

  confirmarReinicio(): void {
    const eid = this.empleadoId();
    if (!eid || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.api
      .confirmarReinicio(eid, {
        anioFiscal: this.anio(),
        periodoReinicio: v.periodoReinicio,
        sustento: v.sustento.trim(),
        observacion: v.observacion.trim() || null,
      })
      .subscribe({
        next: (c) => {
          this.control.set(c);
          this.saving.set(false);
          this.form.reset();
          this.notif.exito('Reinicio de retención confirmado.');
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.snack.open(this.traducir(err), 'Cerrar', { duration: 7000 });
        },
      });
  }

  // ── Helpers de presentación ────────────────────────────────────────────

  fmtMoneda(v: number | null): string {
    if (v == null) return '—';
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  }

  fmtPct(v: number | null): string {
    return v == null ? '—' : `${v.toFixed(2)} %`;
  }

  fmtFechaHora(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-PE');
  }

  etiquetaEstado(estado: EstadoControlIr4ta): string {
    const mapa: Record<EstadoControlIr4ta, string> = {
      VIGENTE: 'Vigente',
      ALERTA_80_PORCIENTO: 'Alerta 80 %',
      ALERTA_90_PORCIENTO: 'Alerta 90 %',
      CERCA_DEL_TOPE: 'Cerca del tope',
      EXCEDE_TOPE_REQUIERE_VALIDACION: 'Excede tope — requiere validación',
      REINICIO_CONFIRMADO: 'Reinicio confirmado',
      RETENCION_ACTIVA: 'Retención activa',
      VENCIDA: 'Vencida',
      ANULADA: 'Anulada',
      '-': 'No aplica',
    };
    return mapa[estado] ?? estado;
  }

  badgeClass(estado: EstadoControlIr4ta): string {
    switch (estado) {
      case 'VIGENTE':
        return 'badge badge--ok';
      case 'ALERTA_80_PORCIENTO':
        return 'badge badge--info';
      case 'ALERTA_90_PORCIENTO':
      case 'CERCA_DEL_TOPE':
        return 'badge badge--warn';
      case 'EXCEDE_TOPE_REQUIERE_VALIDACION':
        return 'badge badge--danger';
      case 'RETENCION_ACTIVA':
      case 'REINICIO_CONFIRMADO':
        return 'badge badge--ok';
      default:
        return 'badge badge--muted';
    }
  }

  private construirAnios(): number[] {
    const actual = new Date().getFullYear();
    const anios: number[] = [];
    for (let y = actual + 1; y >= actual - 4; y--) anios.push(y);
    return anios;
  }

  private traducir(err: HttpErrorResponse): string {
    const body = err.error;
    return isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
  }
}
