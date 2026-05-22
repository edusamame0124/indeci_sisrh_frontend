import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmpleadoPuestoApiService } from '../../services/empleado-puesto-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { CatalogoApiService } from '../../services/catalogo-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { Nivel } from '../../../catalogos/models/nivel.model';
import type { Sede } from '../../../catalogos/models/sede.model';
import type { Oficina } from '../../../catalogos/models/oficina.model';
import type { Dependencia } from '../../../catalogos/models/dependencia.model';
import type { EstructuraOrganica } from '../../../catalogos/models/estructura-organica.model';
import type { EmpleadoPuestoRow } from '../../models/empleado-puesto.model';
import { EmpleadoFlowWarningBannerComponent } from '../../components/empleado-flow-warning-banner/empleado-flow-warning-banner.component';
import { EmpleadoFlowService } from '../../services/empleado-flow.service';
import { EmpleadoFlowBackendSyncService } from '../../services/empleado-flow-backend-sync.service';

@Component({
  selector: 'app-empleado-puesto-form-page',
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
        <a mat-button routerLink="/empleados/puesto">Puesto</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button [routerLink]="['/empleados/puesto/personas', personaId()]">
          {{ personaLabel() }}
        </a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">{{ isEdit() ? 'Editar puesto' : 'Nuevo puesto' }}</span>
      </nav>

      <a mat-button [routerLink]="['/empleados/puesto/personas', personaId()]">Volver</a>

      @if (empleadoId() > 0 && !pageLoading()) {
        <app-empleado-flow-warning-banner
          [empleadoId]="empleadoId()"
          [personaId]="personaId()"
          [currentStep]="1"
        />
      }

      @if (pageLoading()) {
        <div class="loading"><mat-progress-spinner diameter="48" mode="indeterminate" /></div>
      } @else {
        <mat-card class="page-card sisrh-elevated">
          <mat-card-header>
            <mat-card-title>
              @if (isEdit()) {
                Editar puesto vigente
              } @else if (primerRegistroDePuesto()) {
                Registrar nuevo puesto
              } @else {
                Registrar cambio de puesto
              }
            </mat-card-title>
            <mat-card-subtitle>
              @if (isEdit()) {
                Actualiza los datos del puesto activo del colaborador.
              } @else if (primerRegistroDePuesto()) {
                Este será el primer registro de puesto del colaborador.
              } @else {
                Se cerrará el puesto vigente y se abrirá este registro.
              }
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <h3 class="section">Cargo</h3>
              <div class="grid">
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Cargo</mat-label>
                  <input
                    matInput
                    formControlName="cargo"
                    maxlength="200"
                    autocomplete="organization-title"
                    aria-required="true"
                  />
                  @if (form.controls.cargo.hasError('required')) {
                    <mat-error>Ingresa el cargo</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>Nivel</mat-label>
                  <mat-select formControlName="nivelId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (n of niveles(); track n.id) {
                      <mat-option [value]="n.id">{{ n.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <h3 class="section">Ubicación física</h3>
              <div class="grid">
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Sede</mat-label>
                  <mat-select formControlName="sedeId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (s of sedes(); track s.id) {
                      <mat-option [value]="s.id">{{ s.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Oficina</mat-label>
                  <mat-select formControlName="oficinaId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (o of oficinas(); track o.id) {
                      <mat-option [value]="o.id">{{ o.nombre }}</mat-option>
                    }
                  </mat-select>
                  @if (form.controls.sedeId.value === null) {
                    <mat-hint>Selecciona una sede primero</mat-hint>
                  } @else if (oficinasLoading()) {
                    <mat-hint>Cargando oficinas...</mat-hint>
                  } @else if (oficinas().length === 0) {
                    <mat-hint>No hay oficinas para esta sede</mat-hint>
                  }
                </mat-form-field>
              </div>

              <h3 class="section">Estructura organizacional</h3>
              <div class="grid">
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Dependencia</mat-label>
                  <mat-select formControlName="dependenciaId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (d of dependencias(); track d.id) {
                      <mat-option [value]="d.id">{{ d.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Estructura orgánica</mat-label>
                  <mat-select formControlName="estructuraOrganicaId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (e of estructuras(); track e.id) {
                      <mat-option [value]="e.id">{{ e.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="actions">
                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="form.invalid || saving()"
                >
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
    .section {
      margin: 1rem 0 0.5rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--sisrh-text-primary, #1b1b1b);
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding-bottom: 0.25rem;
    }
    .section:first-of-type {
      margin-top: 0;
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
  `,
})
export class EmpleadoPuestoFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly personaApi = inject(PersonaApiService);
  private readonly puestoApi = inject(EmpleadoPuestoApiService);
  private readonly catalogos = inject(CatalogoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly empleadoFlow = inject(EmpleadoFlowService);
  private readonly flowBackendSync = inject(EmpleadoFlowBackendSyncService);

  readonly personaId = signal(0);
  readonly personaLabel = signal('Persona');
  readonly empleadoId = signal(0);
  /** Histórico de puesto vacío: alta inicial (copy distinta a cambio normativo). */
  readonly primerRegistroDePuesto = signal(false);
  readonly puestoId = signal<number | null>(null);
  readonly isEdit = signal(false);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);

  readonly niveles = signal<readonly Nivel[]>([]);
  readonly sedes = signal<readonly Sede[]>([]);
  readonly oficinas = signal<readonly Oficina[]>([]);
  readonly oficinasLoading = signal(false);
  readonly dependencias = signal<readonly Dependencia[]>([]);
  readonly estructuras = signal<readonly EstructuraOrganica[]>([]);

  readonly form = this.fb.group({
    cargo: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    nivelId: this.fb.control<number | null>(null),
    sedeId: this.fb.control<number | null>(null),
    oficinaId: this.fb.control<number | null>(null),
    dependenciaId: this.fb.control<number | null>(null),
    estructuraOrganicaId: this.fb.control<number | null>(null),
  });

  constructor() {
    // Sin sede aún: oficina no seleccionable (evita [disabled] en template con reactive forms).
    this.form.controls.oficinaId.disable({ emitEvent: false });
    // Cascade Sede → Oficina (EC-09-10): al cambiar sede, recargar oficinas por sede y limpiar oficina elegida.
    this.form.controls.sedeId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sedeId) => this.onSedeChange(sedeId ?? null));
  }

  ngOnInit(): void {
    const mode = this.route.snapshot.data?.['mode'] === 'edit' ? 'edit' : 'create';
    this.isEdit.set(mode === 'edit');

    const pidStr = this.route.snapshot.paramMap.get('personaId');
    const pid = pidStr ? Number(pidStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/empleados/puesto']);
      return;
    }
    this.personaId.set(pid);

    if (mode === 'edit') {
      const puestoStr = this.route.snapshot.paramMap.get('puestoId');
      const puestoNum = puestoStr ? Number(puestoStr) : NaN;
      if (!Number.isFinite(puestoNum) || puestoNum < 1) {
        void this.router.navigate(['/empleados/puesto/personas', pid]);
        return;
      }
      this.puestoId.set(puestoNum);
    }

    this.personaApi
      .obtenerPorId(pid)
      .pipe(
        switchMap((persona) => {
          const eidCandidate = persona.empleadoId;
          if (eidCandidate == null || eidCandidate < 1) {
            this.snack.open('No hay empleado vinculado a esta persona.', 'Cerrar', { duration: 5000 });
            void this.router.navigate(['/empleados/puesto']);
            return EMPTY;
          }
          const eid = eidCandidate;
          return forkJoin({
            historial: this.puestoApi.listar(eid),
            niveles: this.catalogos.listarNiveles(),
            sedes: this.catalogos.listarSedes(),
            dependencias: this.catalogos.listarDependencias(),
            estructuras: this.catalogos.listarEstructurasOrganicas(),
          }).pipe(
            switchMap((rest) =>
              this.flowBackendSync.syncCompletedStepsFromBackend(eid).pipe(
                map(() => ({ persona, eid, ...rest })),
              ),
            ),
          );
        }),
      )
      .subscribe({
        next: (res) => {
          const { persona, eid, historial, niveles, sedes, dependencias, estructuras } = res;
          this.personaLabel.set(persona.nombreCompleto);
          this.empleadoId.set(eid);
          this.primerRegistroDePuesto.set(historial.length === 0);
          this.empleadoFlow.hydrateFromPersona(persona);
          this.niveles.set(niveles);
          this.sedes.set(sedes);
          this.dependencias.set(dependencias);
          this.estructuras.set(estructuras);
          if (this.isEdit()) {
            this.patchFromHistorial(eid, this.puestoId()!);
          } else {
            this.pageLoading.set(false);
          }
        },
        error: (err: HttpErrorResponse) => this.onHttpFail(err, ['/empleados/puesto']),
      });
  }

  private patchFromHistorial(empleadoId: number, targetId: number): void {
    this.puestoApi.listar(empleadoId).subscribe({
      next: (list) => {
        const row = list.find((r) => r.id === targetId);
        if (!row || row.activo !== 1) {
          this.snack.open('Solo puede editarse el puesto vigente.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/empleados/puesto/personas', this.personaId()]);
          return;
        }
        this.patchFromRow(row);
      },
      error: (err: HttpErrorResponse) =>
        this.onHttpFail(err, ['/empleados/puesto/personas', this.personaId()]),
    });
  }

  private patchFromRow(row: EmpleadoPuestoRow): void {
    this.form.patchValue({
      cargo: row.cargo,
      nivelId: row.nivelId,
      sedeId: row.sedeId,
      dependenciaId: row.dependenciaId ?? null,
      estructuraOrganicaId: row.estructuraOrganicaId ?? null,
    });

    const sedeId = row.sedeId;
    const oficinaId = row.oficinaId;
    if (sedeId != null && sedeId > 0) {
      this.oficinasLoading.set(true);
      this.catalogos.listarOficinasPorSede(sedeId).subscribe({
        next: (rows) => {
          this.oficinas.set(rows);
          this.oficinasLoading.set(false);
          this.form.controls.oficinaId.enable({ emitEvent: false });
          if (oficinaId != null && oficinaId > 0) {
            this.form.controls.oficinaId.setValue(oficinaId, { emitEvent: false });
          }
          this.pageLoading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.oficinasLoading.set(false);
          this.onHttpFail(err, ['/empleados/puesto/personas', this.personaId()]);
        },
      });
      return;
    }

    this.pageLoading.set(false);
  }

  private onSedeChange(sedeId: number | null): void {
    // Limpiar oficina seleccionada al cambiar sede (sin emitir el cambio para evitar loop).
    this.form.controls.oficinaId.setValue(null, { emitEvent: false });
    if (sedeId === null || sedeId < 1) {
      this.oficinas.set([]);
      this.oficinasLoading.set(false);
      this.form.controls.oficinaId.disable({ emitEvent: false });
      return;
    }
    this.form.controls.oficinaId.disable({ emitEvent: false });
    this.oficinasLoading.set(true);
    this.catalogos.listarOficinasPorSede(sedeId).subscribe({
      next: (rows) => {
        this.oficinas.set(rows);
        this.oficinasLoading.set(false);
        this.form.controls.oficinaId.enable({ emitEvent: false });
      },
      error: (err: HttpErrorResponse) => {
        this.oficinasLoading.set(false);
        this.oficinas.set([]);
        this.form.controls.oficinaId.disable({ emitEvent: false });
        const body = err.error;
        const msg = isErrorResponse(body)
          ? this.errors.translate(body.mensaje)
          : this.errors.translate(null);
        this.snack.open(msg, 'Cerrar', { duration: 5000 });
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const empId = this.empleadoId();
    if (empId < 1) return;

    const cargo = v.cargo.trim().toUpperCase();
    if (!cargo) return;

    const body: import('../../models/empleado-puesto.model').EmpleadoPuestoInput = {
      empleadoId: empId,
      cargo,
      nivelId: v.nivelId != null && v.nivelId > 0 ? v.nivelId : undefined,
      sedeId: v.sedeId != null && v.sedeId > 0 ? v.sedeId : undefined,
      oficinaId: v.oficinaId != null && v.oficinaId > 0 ? v.oficinaId : undefined,
      dependenciaId: v.dependenciaId != null && v.dependenciaId > 0 ? v.dependenciaId : undefined,
      estructuraOrganicaId:
        v.estructuraOrganicaId != null && v.estructuraOrganicaId > 0
          ? v.estructuraOrganicaId
          : undefined,
    };

    this.saving.set(true);
    if (this.isEdit()) {
      const id = this.puestoId();
      if (id == null) {
        this.saving.set(false);
        return;
      }
      this.puestoApi.actualizar(id, body).subscribe({
        next: () => this.onSaved('Puesto actualizado correctamente.'),
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
      return;
    }
    this.puestoApi.guardar(body).subscribe({
      next: () =>
        this.onSaved(
          this.primerRegistroDePuesto()
            ? 'Puesto registrado correctamente.'
            : 'Cambio de puesto registrado.',
        ),
      error: (err: HttpErrorResponse) => this.onSaveErr(err),
    });
  }

  private onSaved(msg: string): void {
    this.saving.set(false);
    this.snack.open(msg, 'Cerrar', { duration: 4000 });
    void this.router.navigate(['/empleados/puesto/personas', this.personaId()]);
  }

  private onSaveErr(err: HttpErrorResponse): void {
    this.saving.set(false);
    const res = err.error;
    const msg = isErrorResponse(res)
      ? this.errors.translate(res.mensaje)
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
