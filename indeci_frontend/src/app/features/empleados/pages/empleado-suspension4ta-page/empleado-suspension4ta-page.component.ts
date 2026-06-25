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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ControlAnualTabComponent } from './components/control-anual-tab/control-anual-tab.component';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PersonaApiService } from '../../services/persona-api.service';
import { Suspension4taApiService } from '../../services/suspension4ta-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import type { Suspension4taRow } from '../../models/suspension4ta.model';

/**
 * FASE 1 — Datos tributarios: suspensión de retención de 4ta categoría (CAS).
 *
 * Pantalla mínima y autocontenida: lista las constancias del empleado, permite
 * registrar una nueva (form inline) y anular. NO calcula nada — solo gestiona
 * el dato que el motor consulta. Base normativa: TUO LIR / suspensión de
 * retención de 4ta (D.Leg. 1057 CAS). El código de tributo SUNAT es 3042.
 */
@Component({
  selector: 'app-empleado-suspension4ta-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
    EmptyStateComponent,
    ControlAnualTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-suspension4ta-page.component.html',
  styleUrl: './empleado-suspension4ta-page.component.css',
})
export class EmpleadoSuspension4taPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly personaApi = inject(PersonaApiService);
  private readonly api = inject(Suspension4taApiService);
  private readonly fb = inject(FormBuilder);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly notif = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = [
    'nroConstancia',
    'fechaEmision',
    'estadoVigencia',
    'acciones',
  ] as const;

  readonly personaId = signal(0);
  readonly empleadoId = signal<number | null>(null);
  readonly persona = signal<PersonaEmpleado | null>(null);
  readonly rows = signal<readonly Suspension4taRow[]>([]);

  /**
   * El control anual del tope solo tiene sentido si el empleado tiene al menos
   * una constancia registrada: sin constancia no hay suspensión que controlar,
   * así que la pestaña "Control anual" se oculta.
   */
  readonly tieneConstancia = computed(() => this.rows().length > 0);

  readonly pageLoading = signal(true);
  readonly tableLoading = signal(false);
  readonly tableLoadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  /** Si está seteado, el formulario edita esa constancia; si es null, crea una nueva. */
  readonly editId = signal<number | null>(null);

  /** Régimen del empleado (de la config de planilla). Puede venir null. */
  readonly regimen = computed(() => this.persona()?.regimenLaboral ?? null);
  readonly regimenEsCas = computed(() => this.esRegimenCas(this.regimen()));
  /** true si el régimen es conocido y NO es CAS → la suspensión de 4ta no aplica al motor. */
  readonly regimenNoCas = computed(() => {
    const r = this.regimen();
    return !!r && !this.esRegimenCas(r);
  });
  /** true si el empleado existe pero no tiene régimen cargado (no se puede confirmar CAS). */
  readonly regimenDesconocido = computed(
    () => this.empleadoId() != null && !this.regimen(),
  );

  readonly form = this.fb.nonNullable.group({
    // N.° de Orden/Operación de la Constancia de Suspensión 4ta (Formulario
    // Virtual 1609 SUNAT). Es numérico → obligatorio + solo dígitos (4–20).
    nroConstancia: ['', [Validators.required, Validators.pattern(/^\d{4,20}$/)]],
    // La constancia rige DESDE su emisión. La pantalla no pide vigencia: el
    // payload deriva fechaVigIni = fechaEmision y fechaVigFin = null
    // (vigencia indefinida), que es lo que el backend/motor requieren. Por eso
    // la emisión es obligatoria.
    fechaEmision: [null as Date | null, Validators.required],
    observacion: [''],
  });

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('personaId');
    const pid = idStr ? Number(idStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/empleados/suspension-4ta']);
      return;
    }
    this.personaId.set(pid);

    this.personaApi.obtenerPorId(pid).subscribe({
      next: (p) => {
        this.persona.set(p);
        const eid = p.empleadoId != null && p.empleadoId > 0 ? p.empleadoId : null;
        this.empleadoId.set(eid);
        this.pageLoading.set(false);
        if (eid != null) this.loadList(eid);
      },
      error: (err: HttpErrorResponse) => {
        this.pageLoading.set(false);
        this.onHttpFailNavigate(err);
      },
    });
  }

  /**
   * Sanea el N.° de constancia mientras se teclea: elimina todo lo que no sea
   * dígito y limita a 20. Así no se puede ingresar texto (el pattern además
   * valida en submit).
   */
  onNroConstanciaInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const limpio = input.value.replace(/\D/g, '').slice(0, 20);
    if (limpio !== input.value) {
      this.form.controls.nroConstancia.setValue(limpio);
    }
  }

  /** Abre/cierra el formulario en modo NUEVO (limpia edición). */
  toggleForm(): void {
    const abriendo = !this.showForm();
    this.showForm.set(abriendo);
    this.form.reset();
    this.editId.set(null);
  }

  /** Abre el formulario en modo EDICIÓN con los valores de la fila. */
  editar(row: Suspension4taRow): void {
    this.editId.set(row.id);
    this.form.reset();
    this.form.patchValue({
      nroConstancia: row.nroConstancia ?? '',
      fechaEmision: this.isoToDate(row.fechaEmision),
      observacion: row.observacion ?? '',
    });
    this.showForm.set(true);
  }

  guardar(): void {
    const eid = this.empleadoId();
    if (eid == null || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    // La pantalla no captura vigencia: la constancia rige desde su emisión y de
    // forma indefinida. fechaVigIni (NOT NULL en BD, requerida por el motor) se
    // deriva de la fecha de emisión; fechaVigFin queda null (sin caducidad).
    const fechaEmisionIso = this.toIso(v.fechaEmision);
    const payload = {
      empleadoId: eid,
      nroConstancia: v.nroConstancia.trim() || null,
      fechaEmision: fechaEmisionIso,
      fechaVigIni: fechaEmisionIso,
      fechaVigFin: null,
      observacion: v.observacion.trim() || null,
    };
    const id = this.editId();
    const req$ = id != null ? this.api.actualizar(id, payload) : this.api.crear(payload);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form.reset();
        this.editId.set(null);
        this.notif.exito(
          id != null
            ? 'Constancia de suspensión de 4ta actualizada.'
            : 'Constancia de suspensión de 4ta registrada.',
        );
        this.loadList(eid);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  confirmAnular(row: Suspension4taRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Anular constancia',
        message: `Se anulará la constancia ${row.nroConstancia ?? '(s/n)'}. ¿Continuar?`,
        confirmLabel: 'Anular',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.anular(row.id);
    });
  }

  /** ISO "YYYY-MM-DD" → "DD/MM/AAAA" para la tabla. */
  fmtFecha(iso: string | null): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
  }

  /** ISO "YYYY-MM-DD" → Date local (para prefilling del datepicker en edición). */
  private isoToDate(iso: string | null): Date | null {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  badgeClass(estadoVigencia: string): string {
    switch (estadoVigencia) {
      case 'VIGENTE':
        return 'badge badge--ok';
      case 'VENCIDA':
        return 'badge badge--warn';
      case 'FUTURA':
        return 'badge badge--info';
      default:
        return 'badge badge--muted';
    }
  }

  private anular(id: number): void {
    const eid = this.empleadoId();
    if (eid == null) return;
    this.api.anular(id).subscribe({
      next: () => {
        this.snack.open('Constancia anulada.', 'Cerrar', { duration: 4000 });
        this.loadList(eid);
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  private loadList(eid: number): void {
    this.tableLoading.set(true);
    this.tableLoadError.set(null);
    this.api.listar(eid).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.rows.set([]);
        this.tableLoadError.set(this.translateHttpError(err));
      },
    });
  }

  private toIso(d: Date | null): string | null {
    if (!d) return null;
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private translateHttpError(err: HttpErrorResponse): string {
    const body = err.error;
    return isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
  }

  private onHttpFailNavigate(err: HttpErrorResponse): void {
    this.snack.open(this.translateHttpError(err), 'Cerrar', { duration: 6000 });
    void this.router.navigate(['/empleados/suspension-4ta']);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    this.snack.open(this.translateHttpError(err), 'Cerrar', { duration: 7000 });
  }

  private esRegimenCas(regimen: string | null): boolean {
    if (!regimen) return false;
    const codigo = regimen.trim().toUpperCase();
    return codigo === 'CAS' || codigo === '1057';
  }
}
