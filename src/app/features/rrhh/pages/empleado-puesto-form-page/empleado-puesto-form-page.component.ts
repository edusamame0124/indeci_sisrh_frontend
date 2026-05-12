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
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmpleadoPuestoApiService } from '../../services/empleado-puesto-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';

@Component({
  selector: 'app-empleado-puesto-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <nav class="crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/rrhh/puesto">Puesto</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button [routerLink]="['/rrhh/puesto/personas', personaId()]">
          {{ personaLabel() }}
        </a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">Nuevo puesto</span>
      </nav>

      <a mat-button [routerLink]="['/rrhh/puesto/personas', personaId()]">Volver</a>

      @if (pageLoading()) {
        <div class="loading"><mat-progress-spinner diameter="48" mode="indeterminate" /></div>
      } @else {
        <mat-card class="page-card sisrh-elevated">
          <mat-card-header>
            <mat-card-title>Registrar cambio de puesto</mat-card-title>
            <mat-card-subtitle>Se cerrará el puesto vigente y se abrirá este registro.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
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

                <mat-form-field appearance="outline" class="half">
                  <mat-label>Nivel ID</mat-label>
                  <input matInput type="number" formControlName="nivelId" min="1" inputmode="numeric" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Sede ID</mat-label>
                  <input matInput type="number" formControlName="sedeId" min="1" inputmode="numeric" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Oficina ID</mat-label>
                  <input matInput type="number" formControlName="oficinaId" min="1" inputmode="numeric" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Jefe directo (ID empleado)</mat-label>
                  <input matInput type="number" formControlName="jefeId" min="1" inputmode="numeric" />
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
export class EmpleadoPuestoFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly personaApi = inject(PersonaApiService);
  private readonly puestoApi = inject(EmpleadoPuestoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly personaId = signal(0);
  readonly personaLabel = signal('Persona');
  readonly empleadoId = signal(0);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    cargo: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    nivelId: this.fb.control<number | null>(null),
    sedeId: this.fb.control<number | null>(null),
    oficinaId: this.fb.control<number | null>(null),
    jefeId: this.fb.control<number | null>(null),
  });

  ngOnInit(): void {
    const pidStr = this.route.snapshot.paramMap.get('personaId');
    const pid = pidStr ? Number(pidStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/rrhh/puesto']);
      return;
    }
    this.personaId.set(pid);

    this.personaApi.obtenerPorId(pid).subscribe({
      next: (p) => {
        this.personaLabel.set(p.nombreCompleto);
        const eid = p.empleadoId != null && p.empleadoId > 0 ? p.empleadoId : 0;
        if (eid < 1) {
          this.snack.open('No hay empleado vinculado a esta persona.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/rrhh/puesto']);
          return;
        }
        this.empleadoId.set(eid);
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.onHttpFail(err, ['/rrhh/puesto']);
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

    const body = {
      empleadoId: empId,
      cargo,
      nivelId: v.nivelId != null && v.nivelId > 0 ? v.nivelId : undefined,
      sedeId: v.sedeId != null && v.sedeId > 0 ? v.sedeId : undefined,
      oficinaId: v.oficinaId != null && v.oficinaId > 0 ? v.oficinaId : undefined,
      jefeId: v.jefeId != null && v.jefeId > 0 ? v.jefeId : undefined,
    };

    this.saving.set(true);
    this.puestoApi.guardar(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Cambio de puesto registrado.', 'Cerrar', { duration: 4000 });
        void this.router.navigate(['/rrhh/puesto/personas', this.personaId()]);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const res = err.error;
        const msg = isErrorResponse(res)
          ? this.errors.translate(res.mensaje)
          : this.errors.translate(null);
        this.snack.open(msg, 'Cerrar', { duration: 7000 });
      },
    });
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
