import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExplicacionPlanillaApiService } from '../../services/explicacion-planilla-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type {
  ExplicacionLinea,
  ExplicacionPlanilla,
} from '../../models/explicacion-planilla.model';

/**
 * F3.1 — Ficha 360 del Empleado.
 *
 * <p>Pantalla estrella de F3. Header con identificación + chips, 6 KPI cards
 * con totales, 9 tabs (Cálculo es el principal de F3.1; los otros van como
 * placeholder y se completan en sub-fases posteriores).</p>
 *
 * <p>Ruta: {@code /empleados/ficha/:empleadoId/:periodo}.</p>
 *
 * <p>Estados:</p>
 * <ul>
 *   <li>Loading: spinner centrado.</li>
 *   <li>{@code aplica = false}: empty state con CTA "Generar planilla".</li>
 *   <li>Error HTTP: snackbar + reintentar.</li>
 *   <li>OK: header + KPIs + tabs.</li>
 * </ul>
 */
@Component({
  selector: 'app-ficha-360-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ficha-360-page.component.html',
  styleUrl: './ficha-360-page.component.css',
})
export class Ficha360PageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ExplicacionPlanillaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly empleadoId = signal(0);
  readonly periodo = signal('');
  readonly loading = signal(true);
  readonly data = signal<ExplicacionPlanilla | null>(null);

  /** Líneas separadas por grupo para renderizar en bloques. */
  readonly lineasIngreso = computed(() =>
    (this.data()?.lineas ?? []).filter((l) => l.grupo === 'INGRESO'),
  );
  readonly lineasDescuento = computed(() =>
    (this.data()?.lineas ?? []).filter(
      (l) => l.grupo === 'DESCUENTO' || l.grupo === 'APORTE_TRABAJADOR',
    ),
  );
  readonly lineasAporteEmpleador = computed(() =>
    (this.data()?.lineas ?? []).filter((l) => l.grupo === 'APORTE_EMPLEADOR'),
  );

  /** Severidad visual de la card "Neto". */
  readonly netoSeverity = computed(() => {
    const e = this.data()?.totales?.estadoNeto;
    return e === 'NETO_NO_VA' ? 'warning' : 'success';
  });

  /** Severidad visual de la card "Dif. AIRHSP". */
  readonly airhspSeverity = computed(() => {
    const tot = this.data()?.totales;
    if (!tot || tot.estadoAirhsp == null) return 'neutral';
    if (tot.estadoAirhsp === 'CONCILIADO') return 'success';
    return 'warning';
  });

  readonly columnasLineas = ['signo', 'descripcion', 'detalle', 'monto'];

  ngOnInit(): void {
    const empIdRaw = this.route.snapshot.paramMap.get('empleadoId');
    const periodo = this.route.snapshot.paramMap.get('periodo');
    const empId = empIdRaw ? Number(empIdRaw) : NaN;
    if (!Number.isFinite(empId) || empId < 1 || !periodo) {
      void this.router.navigate(['/planilla/movimientos']);
      return;
    }
    this.empleadoId.set(empId);
    this.periodo.set(periodo);
    this.cargar(empId, periodo);
  }

  recargar(): void {
    this.cargar(this.empleadoId(), this.periodo());
  }

  irAGenerarPlanilla(): void {
    void this.router.navigate(['/planilla/generacion-individual'], {
      queryParams: { empleadoId: this.empleadoId(), periodo: this.periodo() },
    });
  }

  /**
   * "Explicar cálculo" — abre snackbar con resumen. Posteriormente se puede
   * convertir a un mat-dialog con copy detallado, pero el resumen como
   * snackbar es suficiente para F3.1.
   */
  explicarCalculo(): void {
    const d = this.data();
    if (!d || !d.aplica || !d.totales) return;
    const t = d.totales;
    const msg =
      `Ingresos: S/ ${this.fmt(t.totalIngresos)} · ` +
      `Descuentos: S/ ${this.fmt(t.totalDescuentos)} · ` +
      `Neto: S/ ${this.fmt(t.netoPagar)} (${t.estadoNeto ?? '-'})`;
    this.snack.open(msg, 'Cerrar', { duration: 8000 });
  }

  fmt(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  /** Pista visual para el signo (+ / − / ·) según el grupo de la línea. */
  signoDe(linea: ExplicacionLinea): string {
    if (linea.grupo === 'INGRESO') return '+';
    if (linea.grupo === 'DESCUENTO' || linea.grupo === 'APORTE_TRABAJADOR') return '−';
    return '·';
  }

  private cargar(empleadoId: number, periodo: string): void {
    this.loading.set(true);
    this.api.explicar(empleadoId, periodo).subscribe({
      next: (r) => {
        this.data.set(r);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.data.set(null);
        const body = err.error;
        const msg = isErrorResponse(body)
          ? this.errors.translate(body.mensaje)
          : this.errors.translate(null);
        this.snack.open(msg, 'Cerrar', { duration: 7000 });
      },
    });
  }
}
