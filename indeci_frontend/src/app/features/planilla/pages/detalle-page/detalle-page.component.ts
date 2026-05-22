import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { PlanillaDetalleApiService } from '../../services/planilla-detalle-api.service';
import { GeneradorPlanillaApiService } from '../../services/generador-planilla-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { PlanillaDetalleRow } from '../../models/planilla-detalle.model';
import type { ResumenPlanilla } from '../../models/resumen-planilla.model';

/**
 * Detalle de planilla por empleado/periodo (Spec 009 / T156 — FR-P5).
 * Agrupa movimientos en Ingresos, Descuentos y Aportes empleador (ESSALUD/CUC informativo),
 * con subtotales y neto al final (PANTALLA-03 / LEY-02).
 */
@Component({
  selector: 'app-detalle-page',
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
  templateUrl: './detalle-page.component.html',
  styleUrl: './detalle-page.component.css',
})
export class DetallePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly personaApi = inject(PersonaApiService);
  private readonly detalleApi = inject(PlanillaDetalleApiService);
  private readonly generadorApi = inject(GeneradorPlanillaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = ['codigoConcepto', 'concepto', 'monto'] as const;

  readonly empleadoId = signal(0);
  readonly periodo = signal('');
  readonly persona = signal<PersonaEmpleado | null>(null);
  readonly filas = signal<readonly PlanillaDetalleRow[]>([]);
  readonly resumen = signal<ResumenPlanilla | null>(null);
  readonly loading = signal(true);

  /** 'BIEN' | 'NETO_NO_VA' | null — validación neto 50% (§5.4 / SERVIR-07). */
  readonly estadoNeto = computed(() => this.resumen()?.estadoNeto ?? null);

  /** Clase del semáforo para el template. */
  readonly semaforo = computed<'ok' | 'rojo' | 'neutro'>(() => {
    const e = this.estadoNeto();
    if (e === 'BIEN') return 'ok';
    if (e === 'NETO_NO_VA') return 'rojo';
    return 'neutro';
  });

  readonly ingresos = computed(() => this.filas().filter((r) => r.tipoConcepto === 'INGRESO'));
  readonly descuentos = computed(() => this.filas().filter((r) => r.tipoConcepto === 'DESCUENTO'));
  readonly aportesEmpleador = computed(() =>
    this.filas().filter((r) => r.tipoConcepto === 'APORTE'),
  );

  readonly subtotalIngresos = computed(() =>
    this.ingresos().reduce((acc, r) => acc + (r.monto ?? 0), 0),
  );
  readonly subtotalDescuentos = computed(() =>
    this.descuentos().reduce((acc, r) => acc + (r.monto ?? 0), 0),
  );
  readonly subtotalEssalud = computed(() =>
    this.aportesEmpleador().reduce((acc, r) => acc + (r.monto ?? 0), 0),
  );
  readonly netoPagar = computed(() => this.subtotalIngresos() - this.subtotalDescuentos());
  /** LEY-07: CUC ≈ neto + ESSALUD empleador (informativo). */
  readonly cucTotal = computed(() => this.netoPagar() + this.subtotalEssalud());

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
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

  private cargar(empleadoId: number, periodo: string): void {
    this.loading.set(true);
    forkJoin({
      personas: this.personaApi.listar(),
      detalle: this.detalleApi.listarDetalle(empleadoId, periodo),
      // El resumen aporta el semáforo ESTADO_NETO; si no hay, no rompe la vista.
      resumen: this.generadorApi
        .obtenerResumen(empleadoId, periodo)
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ personas, detalle, resumen }) => {
        const found = personas.find((p) => p.empleadoId === empleadoId) ?? null;
        this.persona.set(found);
        this.filas.set(detalle);
        this.resumen.set(resumen);
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
