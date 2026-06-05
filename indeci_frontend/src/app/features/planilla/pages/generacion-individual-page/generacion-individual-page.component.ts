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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { PeriodoPlanillaApiService } from '../../services/periodo-planilla-api.service';
import { GeneradorPlanillaApiService } from '../../services/generador-planilla-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ValidacionPreflightApiService } from '../../services/validacion-preflight-api.service';
import type { ValidacionHallazgoRow } from '../../models/validacion-hallazgo.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';
import type { ResumenPlanilla } from '../../models/resumen-planilla.model';

type FaseGeneracion = 'idle' | 'generando' | 'completado';

/**
 * Generación individual de planilla (Spec 009 / T154 — FR-P3).
 * - Autocomplete para seleccionar empleado (búsqueda por nombre / DNI / código interno).
 * - Selector de periodo ABIERTO.
 * - Confirmación con `ConfirmDialogComponent` antes de POST.
 * - Card de resumen inmediato (ingresos / descuentos / neto) tras éxito.
 *
 * Nota Spec 009: el task original menciona `EmpleadoSeleccionHubComponent`, pero ese hub
 * está acoplado a rutas `/empleados/{segment}/personas/:id`. Para evitar tocar componentes
 * existentes (los modifica el agente paralelo) se construyó un selector inline equivalente.
 */
@Component({
  selector: 'app-generacion-individual-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './generacion-individual-page.component.html',
  styleUrl: './generacion-individual-page.component.css',
})
export class GeneracionIndividualPageComponent implements OnInit {
  private readonly personaApi = inject(PersonaApiService);
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly generadorApi = inject(GeneradorPlanillaApiService);
  private readonly preflightApi = inject(ValidacionPreflightApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly empleadoSearchCtrl = new FormControl<string | PersonaEmpleado>('');

  readonly personas = signal<readonly PersonaEmpleado[]>([]);
  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly empleadoSeleccionado = signal<PersonaEmpleado | null>(null);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly loading = signal(true);
  readonly fase = signal<FaseGeneracion>('idle');
  readonly resumen = signal<ResumenPlanilla | null>(null);
  /** true = el resumen mostrado proviene de una planilla ya guardada en BD. */
  readonly yaExistia = signal(false);
  /** Hallazgos del preflight filtrados para el empleado seleccionado (no bloquean). */
  readonly hallazgosEmpleado = signal<readonly ValidacionHallazgoRow[]>([]);
  readonly cargandoPreflight = signal(false);
  readonly severidadMaxima = computed(() => {
    const h = this.hallazgosEmpleado();
    if (h.some((x) => x.severidad === 'BLOQUEO')) return 'bloqueo';
    if (h.some((x) => x.severidad === 'ALERTA')) return 'alerta';
    return 'info';
  });

  readonly periodosAbiertos = computed(() =>
    this.periodos().filter((p) => p.estado === 'ABIERTO'),
  );

  readonly personasFiltradas = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const todas = [...this.personas()].sort((a, b) =>
      a.nombreCompleto.localeCompare(b.nombreCompleto, 'es-PE'),
    );
    if (!q) return todas.slice(0, 20);
    return todas
      .filter((p) => {
        const empleadoId = p.empleadoId ?? null;
        if (empleadoId == null || empleadoId < 1) return false;
        const blob = `${p.nombreCompleto} ${p.dni ?? ''} ${p.codigoInterno ?? ''}`.toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 20);
  });

  readonly canGenerar = computed(() => {
    const emp = this.empleadoSeleccionado();
    const per = this.periodoSeleccionado();
    return (
      this.fase() !== 'generando' &&
      emp !== null &&
      emp.empleadoId != null &&
      emp.empleadoId > 0 &&
      per !== null
    );
  });

  iconoSeveridad(severidad: string): string {
    if (severidad === 'BLOQUEO') return 'error';
    if (severidad === 'ALERTA') return 'warning_amber';
    return 'info';
  }

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  constructor() {
    this.empleadoSearchCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.searchQuery.set(value);
          // Si el usuario escribe distinto a la persona seleccionada, des-seleccionar
          if (this.empleadoSeleccionado() !== null) {
            this.empleadoSeleccionado.set(null);
            this.resumen.set(null);
            this.fase.set('idle');
            this.yaExistia.set(false);
            this.hallazgosEmpleado.set([]);
          }
        }
      });
  }

  ngOnInit(): void {
    this.cargar();
  }

  displayPersona(p: PersonaEmpleado | string | null): string {
    if (p === null || typeof p === 'string') return '';
    return `${p.nombreCompleto} — DNI ${p.dni}`;
  }

  onEmpleadoSelected(ev: MatAutocompleteSelectedEvent): void {
    const persona = ev.option.value as PersonaEmpleado;
    if (persona && persona.empleadoId != null && persona.empleadoId > 0) {
      this.empleadoSeleccionado.set(persona);
      this.refrescarResumenExistente();
      this.verificarPreflight();
    }
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.refrescarResumenExistente();
    this.verificarPreflight();
  }

  /**
   * Si hay empleado + periodo seleccionados, consulta la planilla ya guardada
   * en BD y la muestra. Así el cálculo no se pierde al cambiar de pantalla.
   * "Planilla no encontrada" es un caso esperado — se trata en silencio.
   */
  private refrescarResumenExistente(): void {
    const emp = this.empleadoSeleccionado();
    const periodo = this.periodoSeleccionado();
    const empleadoId = emp?.empleadoId ?? null;

    if (empleadoId == null || empleadoId < 1 || periodo == null) {
      this.resumen.set(null);
      this.fase.set('idle');
      this.yaExistia.set(false);
      return;
    }

    this.generadorApi.obtenerResumen(empleadoId, periodo).subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.fase.set('completado');
        this.yaExistia.set(true);
      },
      error: () => {
        // No existe planilla para ese empleado/periodo — estado limpio.
        this.resumen.set(null);
        this.fase.set('idle');
        this.yaExistia.set(false);
      },
    });
  }

  confirmarGeneracion(): void {
    const emp = this.empleadoSeleccionado();
    const periodo = this.periodoSeleccionado();
    if (!emp || !periodo || !this.canGenerar()) return;
    const empleadoId = emp.empleadoId;
    if (empleadoId == null || empleadoId < 1) return;

    const regenera = this.yaExistia();
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: regenera ? 'Regenerar planilla individual' : 'Generar planilla individual',
        message: regenera
          ? `Ya existe una planilla de ${emp.nombreCompleto} para el periodo ${periodo}. `
            + 'Al continuar, el cálculo anterior se reemplaza. ¿Regenerar?'
          : `Se generará la planilla de ${emp.nombreCompleto} para el periodo ${periodo}. ¿Continuar?`,
        confirmLabel: regenera ? 'Regenerar planilla' : 'Generar planilla',
        cancelLabel: 'Cancelar',
        severity: regenera ? 'warning' : 'info',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.ejecutar(empleadoId, periodo);
    });
  }

  /** Disparador real (uso post-confirmación). Público como test seam. */
  ejecutar(empleadoId: number, periodo: string): void {
    this.fase.set('generando');
    this.resumen.set(null);
    this.generadorApi.generarIndividual(empleadoId, periodo).subscribe({
      next: () => {
        this.generadorApi.obtenerResumen(empleadoId, periodo).subscribe({
          next: (r) => {
            this.resumen.set(r);
            this.fase.set('completado');
            this.yaExistia.set(true);
            this.snack.open('Planilla generada correctamente.', 'Cerrar', { duration: 4000 });
          },
          error: (err: HttpErrorResponse) => {
            this.fase.set('completado');
            this.onHttpSnack(err);
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.fase.set('idle');
        this.onHttpSnack(err);
      },
    });
  }

  private cargar(): void {
    this.loading.set(true);
    let pendientes = 2;
    const checkReady = () => {
      pendientes--;
      if (pendientes <= 0) this.loading.set(false);
    };

    this.personaApi.listar().subscribe({
      next: (list) => {
        this.personas.set(list);
        checkReady();
      },
      error: (err: HttpErrorResponse) => {
        this.onHttpSnack(err);
        checkReady();
      },
    });

    this.periodoApi.listar().subscribe({
      next: (list) => {
        const ordenados = [...list].sort((a, b) => b.periodo.localeCompare(a.periodo));
        this.periodos.set(ordenados);
        const inicial = ordenados.find((p) => p.estado === 'ABIERTO');
        if (inicial) this.periodoSeleccionado.set(inicial.periodo);
        checkReady();
      },
      error: (err: HttpErrorResponse) => {
        this.onHttpSnack(err);
        checkReady();
      },
    });
  }

  private verificarPreflight(): void {
    const emp = this.empleadoSeleccionado();
    const periodo = this.periodoSeleccionado();
    if (!emp || emp.empleadoId == null || emp.empleadoId < 1 || !periodo) {
      this.hallazgosEmpleado.set([]);
      return;
    }
    const empId = emp.empleadoId;
    this.cargandoPreflight.set(true);
    this.hallazgosEmpleado.set([]);
    this.preflightApi.preflight(periodo).subscribe({
      next: (res) => {
        this.hallazgosEmpleado.set(res.hallazgos.filter((h) => h.empleadoId === empId));
        this.cargandoPreflight.set(false);
      },
      error: () => {
        this.hallazgosEmpleado.set([]);
        this.cargandoPreflight.set(false);
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
