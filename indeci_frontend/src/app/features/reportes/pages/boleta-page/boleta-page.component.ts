import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { MovimientoPlanillaApiService } from '../../../planilla/services/movimiento-planilla-api.service';
import { PlanillaDetalleApiService } from '../../../planilla/services/planilla-detalle-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { MovimientoPlanillaRow } from '../../../planilla/models/movimiento-planilla.model';
import type { PlanillaDetalleRow } from '../../../planilla/models/planilla-detalle.model';

/**
 * Boleta de pago imprimible (Spec 009 / T160 — FR-R2).
 * Compone:
 *  - GET persona (filtrado de `listar()` por empleadoId)
 *  - GET movimiento-planilla/{empId}/{periodo} (cabecera con totales)
 *  - GET planilla-detalle/{empId}/{periodo} (conceptos)
 *
 * Renderiza HTML A4 portrait con CSS `@media print` (oculta navegación, sin sombras).
 * Incluye aportes empleador ESSALUD/CUC informativos (PANTALLA-03 / LEY-02).
 * Botón "Imprimir / Guardar como PDF" llama `window.print()`.
 */
@Component({
  selector: 'app-boleta-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boleta-page.component.html',
  styleUrl: './boleta-page.component.css',
})
export class BoletaPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly personaApi = inject(PersonaApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly detalleApi = inject(PlanillaDetalleApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columnsIngreso = ['concepto', 'monto'] as const;
  readonly columnsDescuento = ['concepto', 'monto'] as const;

  readonly empleadoId = signal(0);
  readonly periodo = signal('');
  readonly persona = signal<PersonaEmpleado | null>(null);
  readonly movimiento = signal<MovimientoPlanillaRow | null>(null);
  readonly detalle = signal<readonly PlanillaDetalleRow[]>([]);
  readonly loading = signal(true);

  readonly ingresos = computed(() => this.detalle().filter((r) => r.tipoConcepto === 'INGRESO'));
  readonly descuentos = computed(() => this.detalle().filter((r) => r.tipoConcepto === 'DESCUENTO'));
  readonly aportesEmpleador = computed(() =>
    this.detalle().filter((r) => r.tipoConcepto === 'APORTE'),
  );

  readonly subtotalEssalud = computed(() =>
    this.aportesEmpleador().reduce((acc, r) => acc + (r.monto ?? 0), 0),
  );
  readonly netoPagar = computed(() => this.movimiento()?.netoPagar ?? 0);
  /** LEY-07: CUC ≈ neto + ESSALUD empleador (informativo en boleta). */
  readonly cucTotal = computed(() => this.netoPagar() + this.subtotalEssalud());

  readonly hoy = new Date();

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  fmtFechaCorta(value: Date | string | null | undefined): string {
    if (value == null || value === '') return '—';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

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

  imprimir(): void {
    if (typeof window === 'undefined') return;
    window.print();
  }

  readonly descargando = signal(false);

  /** Descarga la boleta en PDF generado por el backend (Spec 011 / B1 — M06). */
  descargarPdf(): void {
    const empId = this.empleadoId();
    const periodo = this.periodo();
    if (empId < 1 || !periodo || this.descargando()) return;

    this.descargando.set(true);
    this.http
      .get(`/api/rrhh/boleta/${empId}/${periodo}/pdf`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          this.descargando.set(false);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `boleta-${empId}-${periodo}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err: HttpErrorResponse) => {
          this.descargando.set(false);
          this.onHttpSnack(err);
        },
      });
  }

  private cargar(empleadoId: number, periodo: string): void {
    this.loading.set(true);
    forkJoin({
      personas: this.personaApi.listar(),
      movimiento: this.movimientoApi.obtenerEmpleado(empleadoId, periodo),
      detalle: this.detalleApi.listarDetalle(empleadoId, periodo),
    }).subscribe({
      next: ({ personas, movimiento, detalle }) => {
        const found = personas.find((p) => p.empleadoId === empleadoId) ?? null;
        this.persona.set(found);
        this.movimiento.set(movimiento);
        this.detalle.set(detalle);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
