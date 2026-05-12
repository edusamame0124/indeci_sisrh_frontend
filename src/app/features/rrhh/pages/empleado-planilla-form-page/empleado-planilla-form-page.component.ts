import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <nav class="crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/rrhh/planilla">Planilla</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button [routerLink]="['/rrhh/planilla/personas', personaId()]">
          {{ personaLabel() }}
        </a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">{{ isEdit() ? 'Editar planilla' : 'Nueva planilla' }}</span>
      </nav>

      <a mat-button [routerLink]="['/rrhh/planilla/personas', personaId()]">Volver</a>

      @if (pageLoading()) {
        <div class="loading"><mat-progress-spinner diameter="48" mode="indeterminate" /></div>
      } @else {
        <mat-card class="page-card sisrh-elevated">
          <mat-card-header>
            <mat-card-title>{{ isEdit() ? 'Editar planilla' : 'Registrar planilla' }}</mat-card-title>
            <mat-card-subtitle>Conceptos remunerativos del colaborador</mat-card-subtitle>
          </mat-card-header>
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
                    inputmode="decimal"
                    aria-required="true"
                  />
                  @if (form.controls.sueldoBasico.hasError('required')) {
                    <mat-error>Ingresa el sueldo básico</mat-error>
                  }
                  @if (form.controls.sueldoBasico.hasError('min')) {
                    <mat-error>El monto debe ser mayor a cero</mat-error>
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
                  <mat-label>Asignación familiar</mat-label>
                  <mat-select formControlName="tieneAsignacionFamiliar" aria-label="Asignación familiar">
                    <mat-option [value]="0">No</mat-option>
                    <mat-option [value]="1">Sí</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>Número de hijos</mat-label>
                  <input matInput type="number" formControlName="numHijos" min="0" step="1" inputmode="numeric" />
                  @if (form.controls.numHijos.hasError('min')) {
                    <mat-error>No puede ser negativo</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="half">
                  <mat-label>Descuento banco</mat-label>
                  <input matInput type="number" formControlName="descuentoBanco" step="0.01" min="0" />
                  @if (form.controls.descuentoBanco.hasError('min')) {
                    <mat-error>El monto no puede ser negativo</mat-error>
                  }
                  @if (isEdit()) {
                    <mat-hint>
                      El listado no muestra descuentos previos; confirma el monto con tu fuente
                      oficial antes de guardar.
                    </mat-hint>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Descuento institución</mat-label>
                  <input
                    matInput
                    type="number"
                    formControlName="descuentoInstitucion"
                    step="0.01"
                    min="0"
                  />
                  @if (form.controls.descuentoInstitucion.hasError('min')) {
                    <mat-error>El monto no puede ser negativo</mat-error>
                  }
                </mat-form-field>
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

  readonly personaId = signal(0);
  readonly personaLabel = signal('Persona');
  readonly empleadoId = signal(0);
  readonly planillaId = signal<number | null>(null);
  readonly isEdit = signal(false);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    sueldoBasico: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    movilidad: this.fb.control<number | null>(null, [Validators.min(0)]),
    alimentacion: this.fb.control<number | null>(null, [Validators.min(0)]),
    tieneAsignacionFamiliar: this.fb.nonNullable.control<number>(0),
    numHijos: this.fb.control<number | null>(null, [Validators.min(0)]),
    descuentoBanco: this.fb.control<number | null>(null, [Validators.min(0)]),
    descuentoInstitucion: this.fb.control<number | null>(null, [Validators.min(0)]),
  });

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] === 'edit' ? 'edit' : 'create';
    this.isEdit.set(mode === 'edit');

    const pidStr = this.route.snapshot.paramMap.get('personaId');
    const pid = pidStr ? Number(pidStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/rrhh/planilla']);
      return;
    }
    this.personaId.set(pid);

    if (mode === 'edit') {
      const plStr = this.route.snapshot.paramMap.get('planillaId');
      const plId = plStr ? Number(plStr) : NaN;
      if (!Number.isFinite(plId) || plId < 1) {
        void this.router.navigate(['/rrhh/planilla/personas', pid]);
        return;
      }
      this.planillaId.set(plId);
    }

    this.personaApi.obtenerPorId(pid).subscribe({
      next: (p) => {
        this.personaLabel.set(p.nombreCompleto);
        const eid = p.empleadoId != null && p.empleadoId > 0 ? p.empleadoId : 0;
        if (eid < 1) {
          this.snack.open('No hay empleado vinculado a esta persona.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/rrhh/planilla']);
          return;
        }
        this.empleadoId.set(eid);
        if (mode === 'edit') {
          this.patchFromList(eid, this.planillaId()!);
        } else {
          this.pageLoading.set(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.onHttpFail(err, ['/rrhh/planilla']);
      },
    });
  }

  private patchFromList(empleadoId: number, targetId: number): void {
    this.planillaApi.listar(empleadoId).subscribe({
      next: (list) => {
        const row = list.find((r) => r.id === targetId);
        if (!row) {
          this.snack.open('No se encontró el registro de planilla solicitado.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/rrhh/planilla/personas', this.personaId()]);
          return;
        }
        this.form.patchValue({
          sueldoBasico: row.sueldoBasico,
          movilidad: row.movilidad,
          alimentacion: row.alimentacion,
          tieneAsignacionFamiliar: row.tieneAsignacionFamiliar ?? 0,
          numHijos: row.numHijos,
          descuentoBanco: 0,
          descuentoInstitucion: 0,
        });
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) =>
        this.onHttpFail(err, ['/rrhh/planilla/personas', this.personaId()]),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const empId = this.empleadoId();
    if (v.sueldoBasico == null || empId < 1) return;

    const body = {
      empleadoId: empId,
      sueldoBasico: v.sueldoBasico,
      movilidad: v.movilidad ?? undefined,
      alimentacion: v.alimentacion ?? undefined,
      tieneAsignacionFamiliar: v.tieneAsignacionFamiliar,
      numHijos: v.numHijos ?? undefined,
      descuentoBanco: v.descuentoBanco ?? undefined,
      descuentoInstitucion: v.descuentoInstitucion ?? undefined,
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
    void this.router.navigate(['/rrhh/planilla/personas', this.personaId()]);
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
