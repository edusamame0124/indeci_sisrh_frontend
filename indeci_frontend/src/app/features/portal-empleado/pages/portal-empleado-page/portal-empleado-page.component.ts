import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { MovimientoPlanillaApiService } from '../../../planilla/services/movimiento-planilla-api.service';
import { PortalEmpleadoApiService } from '../../services/portal-empleado-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { MovimientoPlanillaRow } from '../../../planilla/models/movimiento-planilla.model';
import type { PrestamoRow, VacacionSaldoRow } from '../../models/portal-empleado.model';

/**
 * PANTALLA-08 — Portal del Empleado (SPEC §12.2).
 *
 * Vista consolidada de un empleado: última boleta + comparativo del neto,
 * historial de boletas, saldo de vacaciones, saldo de préstamos y edición de
 * los datos de contacto.
 *
 * El empleado se elige con un selector (no hay vínculo usuario↔empleado en
 * backend): sirve como portal asistido por RRHH / consulta.
 */
@Component({
  selector: 'app-portal-empleado-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portal-empleado-page.component.html',
  styleUrl: './portal-empleado-page.component.css',
})
export class PortalEmpleadoPageComponent implements OnInit {
  private readonly personaApi = inject(PersonaApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly portalApi = inject(PortalEmpleadoApiService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columnasHistorial = ['periodo', 'ingresos', 'descuentos', 'neto', 'boleta'] as const;
  readonly columnasVacaciones = ['anio', 'ganados', 'gozados', 'saldo'] as const;
  readonly columnasPrestamos = ['descripcion', 'cuotas', 'cuotaMensual', 'saldo', 'estado'] as const;

  readonly personas = signal<readonly PersonaEmpleado[]>([]);
  readonly empleadoSeleccionado = signal<number | null>(null);
  readonly movimientos = signal<readonly MovimientoPlanillaRow[]>([]);
  readonly prestamos = signal<readonly PrestamoRow[]>([]);
  readonly vacaciones = signal<readonly VacacionSaldoRow[]>([]);

  readonly emailEdit = signal('');
  readonly telefonoEdit = signal('');

  readonly loading = signal(true);
  readonly datosLoading = signal(false);
  readonly guardandoContacto = signal(false);
  readonly datosListos = signal(false);

  /** Empleados con vínculo, ordenados por nombre. */
  readonly empleados = computed(() =>
    this.personas()
      .filter((p) => p.empleadoId != null)
      .slice()
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)),
  );

  readonly personaActiva = computed(() => {
    const id = this.empleadoSeleccionado();
    if (id == null) return null;
    return this.personas().find((p) => p.empleadoId === id) ?? null;
  });

  /** Movimientos ordenados del período más reciente al más antiguo. */
  readonly historial = computed(() =>
    this.movimientos().slice().sort((a, b) => b.periodo.localeCompare(a.periodo)),
  );

  readonly ultimoMovimiento = computed(() => this.historial()[0] ?? null);
  readonly movimientoAnterior = computed(() => this.historial()[1] ?? null);

  /** Variación del neto del último período respecto al anterior. */
  readonly deltaNeto = computed(() => {
    const ultimo = this.ultimoMovimiento();
    const anterior = this.movimientoAnterior();
    if (ultimo == null || anterior == null) return null;
    return this.round2(ultimo.netoPagar - anterior.netoPagar);
  });

  /** Saldo de vacaciones del año más reciente. */
  readonly saldoVacacionVigente = computed(() => this.vacaciones()[0] ?? null);

  /** Saldo pendiente total de los préstamos ACTIVO. */
  readonly saldoPrestamos = computed(() =>
    this.round2(
      this.prestamos()
        .filter((p) => p.estado === 'ACTIVO')
        .reduce((s, p) => s + p.saldoPendiente, 0),
    ),
  );

  ngOnInit(): void {
    this.cargarPersonas();
  }

  onEmpleadoChange(empleadoId: number): void {
    this.empleadoSeleccionado.set(empleadoId);
    const persona = this.personas().find((p) => p.empleadoId === empleadoId) ?? null;
    this.emailEdit.set(persona?.email ?? '');
    this.telefonoEdit.set(persona?.telefono ?? '');
    this.cargarDatos(empleadoId);
  }

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  // ============ Editar datos de contacto ============

  guardarContacto(): void {
    const persona = this.personaActiva();
    if (persona == null) return;
    const email = this.emailEdit().trim();
    if (email.length === 0) {
      this.snack.open('El correo no puede quedar vacío.', 'Cerrar', { duration: 4000 });
      return;
    }

    this.guardandoContacto.set(true);
    this.personaApi
      .actualizar(persona.id, {
        nombreCompleto: persona.nombreCompleto,
        dni: persona.dni,
        email,
        telefono: this.telefonoEdit().trim(),
        direccion: persona.direccion ?? '',
        distritoId: persona.distritoId ?? '',
        codigoInterno: persona.codigoInterno ?? '',
        estado: persona.estado ?? '',
        sexoId: persona.sexoId ?? null,
        estadoCivilId: persona.estadoCivilId ?? null,
        tipoDocumentoId: persona.tipoDocumentoId ?? null,
        profesionId: persona.profesionId ?? null,
        gradoAcademicoId: persona.gradoAcademicoId ?? null,
      })
      .subscribe({
        next: () => {
          this.guardandoContacto.set(false);
          this.snack.open('Datos de contacto actualizados.', 'Cerrar', { duration: 4000 });
          this.cargarPersonas();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoContacto.set(false);
          this.onHttpSnack(err);
        },
      });
  }

  // ============ Carga de datos ============

  private cargarPersonas(): void {
    this.loading.set(true);
    this.personaApi.listar().subscribe({
      next: (rows) => {
        this.personas.set(rows);
        this.loading.set(false);
        // Spec 011 / B2 — si la cuenta logueada está vinculada a un empleado,
        // el portal abre directamente sus datos (self-service).
        const propio = this.auth.empleadoId();
        if (propio != null && this.empleados().some((e) => e.empleadoId === propio)) {
          this.onEmpleadoChange(propio);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private cargarDatos(empleadoId: number): void {
    this.datosLoading.set(true);
    this.datosListos.set(false);
    forkJoin({
      movimientos: this.movimientoApi.listarPorEmpleado(empleadoId),
      prestamos: this.portalApi.prestamos(empleadoId),
      vacaciones: this.portalApi.vacaciones(empleadoId),
    }).subscribe({
      next: ({ movimientos, prestamos, vacaciones }) => {
        this.movimientos.set(movimientos);
        this.prestamos.set(prestamos);
        this.vacaciones.set(vacaciones);
        this.datosLoading.set(false);
        this.datosListos.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.datosLoading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  // ============ Helpers ============

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
