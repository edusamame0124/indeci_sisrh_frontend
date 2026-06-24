import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../../../../core/models/error-response.model';
import { SubsidioApiService } from '../../../services/subsidio-api.service';
import type {
  SubsidioBaseHistoricaResponse,
  SubsidioCasoResponse,
} from '../../../models/subsidio.models';
import {
  formatSubsidioMonto,
  tienePermisoSubsidio,
} from '../../../utils/subsidio-calculo-display.utils';

/** Una fila editable de la base histórica (un mes de la ventana de 12). */
interface FilaBase {
  periodo: string;
  remuneracionReal: number;
  incidencia: string;
  topeAplicado: number;
  esManual: boolean;
  fuenteMovimientoId: number | null;
}

const INCIDENCIAS = ['NORMAL', 'LSGR', 'FALTA', 'REINTEGRO', 'PARCIAL'] as const;

@Component({
  selector: 'app-subsidio-tab-base',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tab-base-historica.component.html',
  styleUrl: './tab-base-historica.component.css',
})
export class TabBaseHistoricaComponent {
  readonly casoId = input.required<number>();
  readonly modo = input<'resumen' | 'detalle'>('resumen');
  readonly casoActualizado = output<SubsidioCasoResponse>();
  readonly baseCargada = output<SubsidioBaseHistoricaResponse | null>();

  private readonly api = inject(SubsidioApiService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly notif = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly calculando = signal(false);
  readonly base = signal<SubsidioBaseHistoricaResponse | null>(null);
  readonly columnas = ['periodo', 'rem', 'tope', 'base'] as const;
  readonly formatMonto = formatSubsidioMonto;
  readonly incidencias = INCIDENCIAS;

  // ── Estado de edición manual ───────────────────────────────────────────────
  readonly editando = signal(false);
  readonly guardando = signal(false);
  readonly preparando = signal(false);
  readonly filas = signal<readonly FilaBase[]>([]);
  readonly divisor = signal(360);
  readonly fuenteBorrador = signal('MANUAL');
  readonly observacion = signal('');

  /** Base computable por fila = min(remuneración real, tope del mes). */
  baseComputable(f: FilaBase): number {
    const real = Number.isFinite(f.remuneracionReal) ? f.remuneracionReal : 0;
    return Math.max(0, Math.min(real, f.topeAplicado));
  }

  readonly totalBase = computed(() =>
    this.filas().reduce((acc, f) => acc + this.baseComputable(f), 0),
  );
  readonly promedioMensual = computed(() => {
    const n = this.filas().length;
    return n ? this.totalBase() / n : 0;
  });
  /** Subsidio diario estimado = base reconocida / divisor (preview en vivo). */
  readonly subsidioDiario = computed(() => {
    const d = this.divisor();
    return d ? this.totalBase() / d : 0;
  });

  readonly puedeCalcular = () =>
    tienePermisoSubsidio(this.auth.permisos(), 'SUB_CALCULATE');
  readonly puedeEditar = () =>
    tienePermisoSubsidio(this.auth.permisos(), 'SUB_WRITE');

  constructor() {
    effect(() => this.cargarBase(this.casoId()));
  }

  cargar(): void {
    this.cargarBase(this.casoId());
  }

  calcular(): void {
    this.calculando.set(true);
    this.api
      .calcularBase(this.casoId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.calculando.set(false);
          this.base.set(res);
          this.baseCargada.emit(res);
          this.snack.open('Base histórica calculada', 'Cerrar', { duration: 4000 });
          this.api.obtenerCaso(this.casoId()).subscribe({
            next: (c) => this.casoActualizado.emit(c),
          });
        },
        error: (err: HttpErrorResponse) => {
          this.calculando.set(false);
          this.onError(err);
        },
      });
  }

  // ── Edición manual / MIXTA ─────────────────────────────────────────────────

  iniciarEdicion(): void {
    this.preparando.set(true);
    this.api
      .borradorBase(this.casoId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.preparando.set(false);
          this.cargarFilasDesde(res);
          this.editando.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.preparando.set(false);
          this.onError(err);
        },
      });
  }

  /** Abre el editor precargado con la base ya existente (re-edición). */
  editarExistente(): void {
    const actual = this.base();
    if (!actual) {
      this.iniciarEdicion();
      return;
    }
    this.cargarFilasDesde(actual);
    this.editando.set(true);
  }

  cancelarEdicion(): void {
    this.editando.set(false);
    this.filas.set([]);
    this.observacion.set('');
  }

  onRemuneracion(index: number, valor: string): void {
    const num = Number(valor.replace(',', '.'));
    this.actualizarFila(index, {
      remuneracionReal: Number.isFinite(num) ? num : 0,
    });
  }

  onIncidencia(index: number, valor: string): void {
    this.actualizarFila(index, { incidencia: valor });
  }

  guardar(): void {
    const filas = this.filas();
    if (filas.length === 0) {
      return;
    }
    this.guardando.set(true);
    this.api
      .guardarBaseManual(this.casoId(), {
        observacion: this.observacion().trim() || null,
        detalles: filas.map((f) => ({
          periodo: f.periodo,
          remuneracionReal: Number.isFinite(f.remuneracionReal) ? f.remuneracionReal : 0,
          incidencia: f.incidencia,
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.guardando.set(false);
          this.editando.set(false);
          this.base.set(res);
          this.baseCargada.emit(res);
          this.notif.exito('Base histórica guardada.');
          this.api.obtenerCaso(this.casoId()).subscribe({
            next: (c) => this.casoActualizado.emit(c),
          });
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.onError(err);
        },
      });
  }

  private cargarFilasDesde(res: SubsidioBaseHistoricaResponse): void {
    this.divisor.set(res.divisorPromedio || 360);
    this.fuenteBorrador.set(res.fuente);
    this.filas.set(
      res.detalle.map((d) => ({
        periodo: d.periodo,
        remuneracionReal: d.remuneracionReal ?? 0,
        incidencia: d.incidencia ?? 'NORMAL',
        topeAplicado: d.topeAplicado ?? 0,
        esManual: d.esManual !== 'N',
        fuenteMovimientoId: d.fuenteMovimientoId ?? null,
      })),
    );
  }

  private actualizarFila(index: number, cambios: Partial<FilaBase>): void {
    this.filas.update((filas) =>
      filas.map((f, i) => (i === index ? { ...f, ...cambios } : f)),
    );
  }

  private cargarBase(casoId: number): void {
    this.loading.set(true);
    this.editando.set(false);
    this.api
      .obtenerBase(casoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.base.set(res);
          this.baseCargada.emit(res);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 404) {
            this.base.set(null);
            this.baseCargada.emit(null);
            return;
          }
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
