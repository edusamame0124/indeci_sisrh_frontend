import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, forkJoin } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmpleadoPensionApiService } from '../../services/empleado-pension-api.service';
import { CatalogoApiService } from '../../services/catalogo-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type {
  RegimenPensionarioCatalogItem,
  TipoComisionAfpCatalogItem,
} from '../../models/catalog-item.model';
import type {
  EmpleadoPensionInput,
  TasasVigentesPension,
} from '../../models/empleado-pension.model';
import { EmpleadoFlowWarningBannerComponent } from '../../components/empleado-flow-warning-banner/empleado-flow-warning-banner.component';
import { EmpleadoFlowService } from '../../services/empleado-flow.service';
import { EmpleadoFlowBackendSyncService } from '../../services/empleado-flow-backend-sync.service';

/**
 * CUSPP — Código Único del Sistema Privado de Pensiones (SBS).
 * 12 caracteres alfanuméricos, exclusivamente mayúsculas A-Z y dígitos 0-9.
 * Ej. válido: GONZAL94125B.
 */
const CUSPP_PATTERN = /^[A-Z0-9]{12}$/;
const CUSPP_INVALID_CHARS = /[^A-Z0-9]/g;

/** Convierte una tasa en fracción (0.0155) a porcentaje (1.55) con 2 decimales. */
function toPercent(fraction: number | null): number | null {
  if (fraction == null) return null;
  return Math.round(fraction * 10000) / 100;
}

@Component({
  selector: 'app-empleado-pension-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    EmpleadoFlowWarningBannerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-pension-form-page.component.html',
  styleUrl: './empleado-pension-form-page.component.css',
})
export class EmpleadoPensionFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly personaApi = inject(PersonaApiService);
  private readonly pensionApi = inject(EmpleadoPensionApiService);
  private readonly catalogoApi = inject(CatalogoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly empleadoFlow = inject(EmpleadoFlowService);
  private readonly flowBackendSync = inject(EmpleadoFlowBackendSyncService);

  readonly personaId = signal(0);
  readonly personaLabel = signal('Persona');
  readonly empleadoId = signal(0);
  readonly pensionId = signal<number | null>(null);
  readonly isEdit = signal(false);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);

  readonly regimenes = signal<readonly RegimenPensionarioCatalogItem[]>([]);
  readonly tiposComision = signal<readonly TipoComisionAfpCatalogItem[]>([]);

  readonly form = this.fb.group({
    regimenPensionarioId: this.fb.control<number | null>(null, Validators.required),
    cuspp: this.fb.nonNullable.control<string>(''),
    tipoComisionAfpId: this.fb.control<number | null>(null),
    porcentajeAporte: this.fb.control<number | null>(null),
    porcentajeComision: this.fb.control<number | null>(null),
    porcentajeSeguro: this.fb.control<number | null>(null),
  });

  readonly tipoRegimenSeleccionado = signal<string | null>(null);
  readonly esAfp = computed(() => this.tipoRegimenSeleccionado() === 'AFP');
  readonly esOnp = computed(() => this.tipoRegimenSeleccionado() === 'ONP');

  // Spec 013 / C1 — autocomplete de tasas vigentes desde el catálogo.
  readonly tasasVigentes = signal<TasasVigentesPension | null>(null);
  readonly tasasLoading = signal(false);
  readonly tasasError = signal(false);
  /** Cuando false, los 3 % se ven readonly (valor del catálogo). Toggle "Personalizar". */
  readonly personalizarTasas = signal(false);
  readonly mostrarBloqueTasas = computed(() => this.esAfp());

  constructor() {
    this.form.controls.regimenPensionarioId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.onRegimenChange(id));

    // Cuando cambia el tipo de comisión (solo AFP), refrescamos las tasas.
    this.form.controls.tipoComisionAfpId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.esAfp()) this.fetchTasas();
      });
  }

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] === 'edit' ? 'edit' : 'create';
    this.isEdit.set(mode === 'edit');

    const pidStr = this.route.snapshot.paramMap.get('personaId');
    const pid = pidStr ? Number(pidStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/empleados/pension']);
      return;
    }
    this.personaId.set(pid);

    if (mode === 'edit') {
      const midStr = this.route.snapshot.paramMap.get('pensionId');
      const mid = midStr ? Number(midStr) : NaN;
      if (!Number.isFinite(mid) || mid < 1) {
        void this.router.navigate(['/empleados/pension/personas', pid]);
        return;
      }
      this.pensionId.set(mid);
    }

    forkJoin({
      persona: this.personaApi.obtenerPorId(pid),
      regimenes: this.catalogoApi.listarRegimenesPensionarios(),
      tiposComision: this.catalogoApi.listarTiposComisionAfp(),
    })
      .pipe(
        switchMap(({ persona, regimenes, tiposComision }) => {
          this.personaLabel.set(persona.nombreCompleto);
          this.regimenes.set(regimenes);
          this.tiposComision.set(tiposComision);

          const eid = persona.empleadoId != null && persona.empleadoId > 0 ? persona.empleadoId : 0;
          if (eid < 1) {
            this.snack.open('No hay empleado vinculado a esta persona.', 'Cerrar', { duration: 5000 });
            void this.router.navigate(['/empleados/pension']);
            return EMPTY;
          }
          this.empleadoId.set(eid);
          this.empleadoFlow.hydrateFromPersona(persona);
          return this.flowBackendSync.syncCompletedStepsFromBackend(eid).pipe(map(() => mode));
        }),
      )
      .subscribe({
        next: (m) => {
          if (m === undefined) return;
          if (m === 'edit') {
            this.patchFromList(this.empleadoId(), this.pensionId() as number);
          } else {
            this.pageLoading.set(false);
          }
        },
        error: (err: HttpErrorResponse) => this.onHttpFail(err, ['/empleados/pension']),
      });
  }

  private onRegimenChange(id: number | null, opts: { skipFetch?: boolean } = {}): void {
    const regimen = id != null ? this.regimenes().find((r) => r.id === id) : undefined;
    const tipo = regimen?.tipo?.trim().toUpperCase() ?? null;
    this.tipoRegimenSeleccionado.set(tipo);

    const cusppCtrl = this.form.controls.cuspp;
    const tipoComisionCtrl = this.form.controls.tipoComisionAfpId;
    const pctCtrls = [
      this.form.controls.porcentajeAporte,
      this.form.controls.porcentajeComision,
      this.form.controls.porcentajeSeguro,
    ];

    if (tipo === 'AFP') {
      cusppCtrl.setValidators([Validators.required, Validators.pattern(CUSPP_PATTERN)]);
      tipoComisionCtrl.setValidators([Validators.required, Validators.min(1)]);
      // % readonly por defecto (autocompletado del catálogo). El usuario
      // entra a "Personalizar tasas" para editarlos.
      this.personalizarTasas.set(false);
      for (const c of pctCtrls) c.disable({ emitEvent: false });
      if (!opts.skipFetch) this.fetchTasas();
    } else {
      cusppCtrl.clearValidators();
      tipoComisionCtrl.clearValidators();
      tipoComisionCtrl.setValue(null, { emitEvent: false });
      // ONP / otros: % no aplican — limpiamos y deshabilitamos.
      for (const c of pctCtrls) {
        c.setValue(null, { emitEvent: false });
        c.disable({ emitEvent: false });
      }
      this.tasasVigentes.set(null);
      this.tasasError.set(false);
    }
    cusppCtrl.updateValueAndValidity({ emitEvent: false });
    tipoComisionCtrl.updateValueAndValidity({ emitEvent: false });
  }

  /** Consulta las tasas vigentes y autocompleta el form si no se está personalizando. */
  private fetchTasas(opts: { skipFormPatch?: boolean } = {}): void {
    const regimenId = this.form.controls.regimenPensionarioId.value;
    if (regimenId == null) {
      this.tasasVigentes.set(null);
      return;
    }
    const tipoId = this.esAfp() ? this.form.controls.tipoComisionAfpId.value : null;
    this.tasasLoading.set(true);
    this.tasasError.set(false);
    this.pensionApi.obtenerTasasVigentes(regimenId, tipoId).subscribe({
      next: (t) => {
        this.tasasVigentes.set(t);
        this.tasasLoading.set(false);
        if (!opts.skipFormPatch && !this.personalizarTasas()) {
          this.form.patchValue(
            {
              porcentajeAporte: toPercent(t.aporte),
              porcentajeComision: toPercent(t.comision),
              porcentajeSeguro: toPercent(t.prima),
            },
            { emitEvent: false },
          );
        }
      },
      error: () => {
        this.tasasLoading.set(false);
        this.tasasError.set(true);
      },
    });
  }

  /**
   * Toggle del bloque "Personalizar tasas". Cuando se activa, habilita los 3
   * inputs % para edición. Cuando se desactiva, restaura los valores del
   * catálogo (si están cargados) y vuelve a readonly.
   */
  togglePersonalizar(): void {
    const next = !this.personalizarTasas();
    this.personalizarTasas.set(next);
    const pctCtrls = [
      this.form.controls.porcentajeAporte,
      this.form.controls.porcentajeComision,
      this.form.controls.porcentajeSeguro,
    ];
    if (next) {
      for (const c of pctCtrls) c.enable({ emitEvent: false });
    } else {
      for (const c of pctCtrls) c.disable({ emitEvent: false });
      // Restaurar valores del catálogo si los tenemos.
      const t = this.tasasVigentes();
      if (t) {
        this.form.patchValue(
          {
            porcentajeAporte: toPercent(t.aporte),
            porcentajeComision: toPercent(t.comision),
            porcentajeSeguro: toPercent(t.prima),
          },
          { emitEvent: false },
        );
      }
    }
  }

  private patchFromList(empleadoId: number, targetId: number): void {
    this.pensionApi.listar(empleadoId).subscribe({
      next: (list) => {
        const row = list.find((r) => r.id === targetId);
        if (!row) {
          this.snack.open('No se encontró el registro solicitado.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/empleados/pension/personas', this.personaId()]);
          return;
        }
        // emitEvent:false para evitar que onRegimenChange dispare y haga
        // un fetch que sobreescriba los valores guardados del empleado.
        this.form.patchValue(
          {
            regimenPensionarioId: row.regimenPensionarioId,
            cuspp: row.cuspp ?? '',
            tipoComisionAfpId: row.tipoComisionAfpId,
            porcentajeAporte: row.porcentajeAporte,
            porcentajeComision: row.porcentajeComision,
            porcentajeSeguro: row.porcentajeSeguro,
          },
          { emitEvent: false },
        );
        // Aplicar validators / disabled según régimen, sin fetch — los
        // valores guardados son la fuente de verdad en edit.
        this.onRegimenChange(row.regimenPensionarioId, { skipFetch: true });
        // Cargar las tasas del catálogo solo para mostrarlas como referencia.
        if (this.esAfp()) this.fetchTasas({ skipFormPatch: true });
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) =>
        this.onHttpFail(err, ['/empleados/pension/personas', this.personaId()]),
    });
  }

  /**
   * Sanea la entrada del CUSPP en cada keystroke: pasa a mayúsculas, descarta
   * cualquier carácter que no sea A-Z o 0-9, y limita a 12. Solo reescribe el
   * control cuando hubo algo que limpiar — así el cursor no salta en el caso
   * común (el usuario teclea un carácter válido).
   */
  onCusppInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const cleaned = input.value
      .toUpperCase()
      .replace(CUSPP_INVALID_CHARS, '')
      .slice(0, 12);
    if (input.value !== cleaned) {
      this.form.controls.cuspp.setValue(cleaned);
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const empId = this.empleadoId();
    const regimenId = v.regimenPensionarioId;
    if (empId < 1 || regimenId == null) return;

    const regimen = this.regimenes().find((r) => r.id === regimenId);
    const tipoRegimen = regimen?.tipo?.trim().toUpperCase() ?? '';

    const body: EmpleadoPensionInput = {
      empleadoId: empId,
      regimenPensionarioId: regimenId,
      cuspp: v.cuspp.trim(),
      porcentajeAporte: v.porcentajeAporte,
      porcentajeComision: v.porcentajeComision,
      porcentajeSeguro: v.porcentajeSeguro,
      tipoComisionAfpId: tipoRegimen === 'AFP' ? v.tipoComisionAfpId : null,
      tipoRegimen,
    };

    this.saving.set(true);
    if (this.isEdit()) {
      const id = this.pensionId();
      if (id == null) {
        this.saving.set(false);
        return;
      }
      this.pensionApi.actualizar(id, body).subscribe({
        next: () => this.onSaved('Pensión actualizada.'),
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
      return;
    }
    this.pensionApi.guardar(body).subscribe({
      next: () => this.onSaved('Pensión registrada.'),
      error: (err: HttpErrorResponse) => this.onSaveErr(err),
    });
  }

  private onSaved(msg: string): void {
    this.saving.set(false);
    this.snack.open(msg, 'Cerrar', { duration: 4000 });
    void this.router.navigate(['/empleados/pension/personas', this.personaId()]);
  }

  private onSaveErr(err: HttpErrorResponse): void {
    this.saving.set(false);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }

  private onHttpFail(err: HttpErrorResponse, segments: readonly (string | number)[]): void {
    this.pageLoading.set(false);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
    void this.router.navigate([...segments]);
  }
}
