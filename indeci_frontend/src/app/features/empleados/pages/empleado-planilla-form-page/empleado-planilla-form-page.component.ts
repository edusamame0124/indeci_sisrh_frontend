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
import { EMPTY } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmpleadoPlanillaApiService } from '../../services/empleado-planilla-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { EmpleadoFlowWarningBannerComponent } from '../../components/empleado-flow-warning-banner/empleado-flow-warning-banner.component';
import { EmpleadoFlowService } from '../../services/empleado-flow.service';
import { EmpleadoFlowBackendSyncService } from '../../services/empleado-flow-backend-sync.service';

/**
 * Sueldo básico: máximo 5 dígitos enteros (S/ 99,999.99). Refleja el tope
 * razonable para una remuneración mensual del sector público — además impide
 * que un pegado accidental cargue cifras absurdas en la planilla.
 */
const SUELDO_INT_DIGITS = 5;
const SUELDO_MAX = 99999.99;

@Component({
  selector: 'app-empleado-planilla-form-page',
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
  template: `
    <div class="page">
      <nav class="crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/empleados/planilla">Planilla</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button [routerLink]="['/empleados/planilla/personas', personaId()]">
          {{ personaLabel() }}
        </a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">{{ isEdit() ? 'Editar configuración' : 'Nueva configuración' }}</span>
      </nav>

      <a mat-button [routerLink]="['/empleados/planilla/personas', personaId()]">Volver</a>

      @if (empleadoId() > 0 && !pageLoading()) {
        <app-empleado-flow-warning-banner
          [empleadoId]="empleadoId()"
          [personaId]="personaId()"
          [currentStep]="4"
        />
      }

      @if (pageLoading()) {
        <div class="loading"><mat-progress-spinner diameter="48" mode="indeterminate" /></div>
      } @else {
        <mat-card class="page-card sisrh-elevated">
          <mat-card-header>
            <mat-card-title>
              {{ isEdit() ? 'Editar configuración remunerativa' : 'Configuración remunerativa' }}
            </mat-card-title>
            <mat-card-subtitle>
              Información remunerativa usada cada mes para calcular la planilla
            </mat-card-subtitle>
          </mat-card-header>
      <br>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="grid">
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Sueldo básico</mat-label>
                  <input
                    matInput
                    type="number"
                    formControlName="sueldoBasico"
                    step="0.01"
                    min="0.01"
                    max="99999.99"
                    inputmode="decimal"
                    aria-required="true"
                    (input)="onSueldoBasicoInput($event)"
                  />
                  <mat-hint>Máximo 5 dígitos enteros — hasta S/ 99,999.99</mat-hint>
                  @if (form.controls.sueldoBasico.hasError('required')) {
                    <mat-error>Ingresa el sueldo básico</mat-error>
                  }
                  @if (form.controls.sueldoBasico.hasError('min')) {
                    <mat-error>El monto debe ser mayor a cero</mat-error>
                  }
                  @if (form.controls.sueldoBasico.hasError('max')) {
                    <mat-error>El sueldo no puede exceder S/ 99,999.99 (5 dígitos)</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="half">
                  <mat-label>Asignación movilidad</mat-label>
                  <input matInput type="number" formControlName="movilidad" step="0.01" min="0" />
                  @if (form.controls.movilidad.hasError('min')) {
                    <mat-error>El monto no puede ser negativo</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Asignación alimentación</mat-label>
                  <input matInput type="number" formControlName="alimentacion" step="0.01" min="0" />
                  @if (form.controls.alimentacion.hasError('min')) {
                    <mat-error>El monto no puede ser negativo</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>Número de hijos</mat-label>
                  <input matInput type="number" formControlName="numHijos" min="0" step="1" inputmode="numeric" />
                  @if (form.controls.numHijos.hasError('min')) {
                    <mat-error>No puede ser negativo</mat-error>
                  }
                </mat-form-field>

                <!-- Spec 013/C1 — el sistema infiere la asignación familiar a
                     partir de "Número de hijos". El motor de planilla aplica
                     automáticamente 10% RMV (S/ 102.50/mes en 2026) para los
                     regímenes que la reconocen por ley. -->
                @if (tieneHijos()) {
                  <div class="asig-fam-hint full" role="note">
                    <strong>Asignación familiar activa.</strong>
                    El motor aplicará automáticamente 10% RMV (≈ S/ 102.50 / mes en 2026)
                    si el trabajador es del régimen <strong>728</strong> o <strong>CAS</strong>.
                    Los regímenes <strong>276</strong> y <strong>SERVIR</strong> no reciben
                    este concepto por normativa.
                  </div>
                }
              </div>

              <div class="actions">
                <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                  Guardar
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 1rem;
      font-family: var(--sisrh-font-sans, sans-serif);
    }
    .page-card.sisrh-elevated {
      box-shadow:
        0 1px 2px rgb(15 23 42 / 6%),
        0 6px 20px rgb(15 23 42 / 8%);
      border-radius: 12px;
      margin-top: 0.75rem;
    }
    .crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
      font-size: 0.875rem;
    }
    .crumbs__sep {
      color: #94a3b8;
    }
    .crumbs__here {
      font-weight: 600;
      color: #475569;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    @media (max-width: 720px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    .full {
      grid-column: 1 / -1;
    }
    .actions {
      margin-top: 1rem;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    .asig-fam-hint {
      grid-column: 1 / -1;
      padding: 0.625rem 0.75rem;
      border-left: 3px solid #2563eb;
      background: #eff6ff;
      border-radius: 6px;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: #1e3a8a;
    }
    .asig-fam-hint strong {
      color: #1e3a8a;
    }
  `,
})
export class EmpleadoPlanillaFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly personaApi = inject(PersonaApiService);
  private readonly planillaApi = inject(EmpleadoPlanillaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly empleadoFlow = inject(EmpleadoFlowService);
  private readonly flowBackendSync = inject(EmpleadoFlowBackendSyncService);

  readonly personaId = signal(0);
  readonly personaLabel = signal('Persona');
  readonly empleadoId = signal(0);
  readonly planillaId = signal<number | null>(null);
  readonly isEdit = signal(false);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    sueldoBasico: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(SUELDO_MAX),
    ]),
    movilidad: this.fb.control<number | null>(null, [Validators.min(0)]),
    alimentacion: this.fb.control<number | null>(null, [Validators.min(0)]),
    numHijos: this.fb.control<number | null>(null, [Validators.min(0)]),
  });

  /**
   * Signal reactivo a `numHijos`. Cuando el operador declara hijos, mostramos
   * el hint que explica que el motor aplicará la asignación familiar
   * automáticamente para regímenes 728 y CAS.
   */
  readonly tieneHijos = computed(() => {
    const n = this.numHijosSignal();
    return typeof n === 'number' && n > 0;
  });
  private readonly numHijosSignal = signal<number | null>(null);

  constructor() {
    // Mantiene `tieneHijos` reactivo a cambios del control `numHijos`.
    this.form.controls.numHijos.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((n) => this.numHijosSignal.set(n));
  }

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] === 'edit' ? 'edit' : 'create';
    this.isEdit.set(mode === 'edit');

    const pidStr = this.route.snapshot.paramMap.get('personaId');
    const pid = pidStr ? Number(pidStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/empleados/planilla']);
      return;
    }
    this.personaId.set(pid);

    if (mode === 'edit') {
      const plStr = this.route.snapshot.paramMap.get('planillaId');
      const plId = plStr ? Number(plStr) : NaN;
      if (!Number.isFinite(plId) || plId < 1) {
        void this.router.navigate(['/empleados/planilla/personas', pid]);
        return;
      }
      this.planillaId.set(plId);
    }

    this.personaApi
      .obtenerPorId(pid)
      .pipe(
        switchMap((p) => {
          this.personaLabel.set(p.nombreCompleto);
          const eid = p.empleadoId != null && p.empleadoId > 0 ? p.empleadoId : 0;
          if (eid < 1) {
            this.snack.open('No hay empleado vinculado a esta persona.', 'Cerrar', { duration: 5000 });
            void this.router.navigate(['/empleados/planilla']);
            return EMPTY;
          }
          this.empleadoId.set(eid);
          this.empleadoFlow.hydrateFromPersona(p);
          return this.flowBackendSync.syncCompletedStepsFromBackend(eid);
        }),
      )
      .subscribe({
        next: () => {
          if (mode === 'edit') {
            this.patchFromList(this.empleadoId(), this.planillaId()!);
          } else {
            this.pageLoading.set(false);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.onHttpFail(err, ['/empleados/planilla']);
        },
      });
  }

  private patchFromList(empleadoId: number, targetId: number): void {
    this.planillaApi.listar(empleadoId).subscribe({
      next: (list) => {
        const row = list.find((r) => r.id === targetId);
        if (!row) {
          this.snack.open('No se encontró el registro de planilla solicitado.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/empleados/planilla/personas', this.personaId()]);
          return;
        }
        // Spec 013/C1 — `tieneAsignacionFamiliar`, `descuentoBanco` y
        // `descuentoInstitucion` ya no están en el form. El primero se deriva
        // de `numHijos > 0` al guardar; los descuentos viven en INDECI_PRESTAMO
        // y EmpleadoConcepto (módulos dedicados).
        this.form.patchValue({
          sueldoBasico: row.sueldoBasico,
          movilidad: row.movilidad,
          alimentacion: row.alimentacion,
          numHijos: row.numHijos,
        });
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) =>
        this.onHttpFail(err, ['/empleados/planilla/personas', this.personaId()]),
    });
  }

  /**
   * Limita el sueldo básico a {@link SUELDO_INT_DIGITS} dígitos enteros + 2
   * decimales mientras el usuario teclea. Sin esto, `type=number` deja pegar
   * cadenas largas como "651651...555" que el validador `max` igual rechaza,
   * pero la entrada visual sigue siendo desastrosa.
   */
  onSueldoBasicoInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input || input.value === '') return;
    const raw = input.value;
    const [intPart = '', decPart] = raw.split('.');
    const cappedInt = intPart.slice(0, SUELDO_INT_DIGITS);
    const cappedDec = decPart != null ? decPart.slice(0, 2) : undefined;
    const cleaned = cappedDec !== undefined ? `${cappedInt}.${cappedDec}` : cappedInt;
    if (raw !== cleaned) {
      const num = cleaned === '' || cleaned === '.' ? null : Number(cleaned);
      this.form.controls.sueldoBasico.setValue(Number.isFinite(num as number) ? (num as number) : null);
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const empId = this.empleadoId();
    if (v.sueldoBasico == null || empId < 1) return;

    // Spec 013/C1 — derivamos `tieneAsignacionFamiliar` desde `numHijos > 0`.
    // El motor lo combina con el régimen laboral (728/CAS → aplica; 276/SERVIR
    // → no aplica por ley) en su propio cálculo. `descuentoBanco` y
    // `descuentoInstitucion` se omiten: hoy son letra muerta en el motor; los
    // descuentos reales viven en INDECI_PRESTAMO y EmpleadoConcepto.
    const numHijos = v.numHijos ?? 0;
    const body = {
      empleadoId: empId,
      sueldoBasico: v.sueldoBasico,
      movilidad: v.movilidad ?? undefined,
      alimentacion: v.alimentacion ?? undefined,
      tieneAsignacionFamiliar: numHijos > 0 ? 1 : 0,
      numHijos: v.numHijos ?? undefined,
    };

    this.saving.set(true);
    if (this.isEdit()) {
      const id = this.planillaId();
      if (id == null) {
        this.saving.set(false);
        return;
      }
      this.planillaApi.actualizar(id, body).subscribe({
        next: () => this.onSaved('Planilla actualizada.'),
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
      return;
    }
    this.planillaApi.guardar(body).subscribe({
      next: () => this.onSaved('Planilla registrada.'),
      error: (err: HttpErrorResponse) => this.onSaveErr(err),
    });
  }

  private onSaved(msg: string): void {
    this.saving.set(false);
    this.snack.open(msg, 'Cerrar', { duration: 4000 });
    void this.router.navigate(['/empleados/planilla/personas', this.personaId()]);
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
