import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { EmpleadoPensionApiService } from '../../services/empleado-pension-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PensionTipo } from '../../models/empleado-pension.model';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <nav class="crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/rrhh/pension">Pensión</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button [routerLink]="['/rrhh/pension/personas', personaId()]">
          {{ personaLabel() }}
        </a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">{{ isEdit() ? 'Editar pensión' : 'Nueva pensión' }}</span>
      </nav>

      <a mat-button [routerLink]="['/rrhh/pension/personas', personaId()]">Volver</a>

      @if (pageLoading()) {
        <div class="loading"><mat-progress-spinner diameter="48" mode="indeterminate" /></div>
      } @else {
        <mat-card class="page-card sisrh-elevated">
          <mat-card-header>
            <mat-card-title>{{ isEdit() ? 'Editar pensión' : 'Registrar pensión' }}</mat-card-title>
            <mat-card-subtitle>AFP u ONP según normativa vigente</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="grid">
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Tipo</mat-label>
                  <mat-select formControlName="tipo" aria-label="Tipo de pensión">
                    <mat-option value="AFP">AFP</mat-option>
                    <mat-option value="ONP">ONP</mat-option>
                  </mat-select>
                  @if (form.controls.tipo.hasError('required')) {
                    <mat-error>Selecciona el tipo</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>ID AFP (catálogo)</mat-label>
                  <input matInput type="number" formControlName="afpId" inputmode="numeric" min="1" />
                  @if (form.controls.afpId.hasError('required')) {
                    <mat-error>Indica el identificador de AFP</mat-error>
                  }
                  @if (form.controls.tipo.value === 'ONP') {
                    <mat-hint>Opcional para ONP.</mat-hint>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>CUSPP</mat-label>
                  <input matInput formControlName="cuspp" maxlength="32" autocomplete="off" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="half">
                  <mat-label>% Aporte</mat-label>
                  <input matInput type="number" formControlName="porcentajeAporte" step="0.01" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="half">
                  <mat-label>% Comisión</mat-label>
                  <input matInput type="number" formControlName="porcentajeComision" step="0.01" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="half">
                  <mat-label>% Seguro</mat-label>
                  <input matInput type="number" formControlName="porcentajeSeguro" step="0.01" />
                </mat-form-field>
              </div>
              @if (isEdit()) {
                <p class="note">
                  Los porcentajes de comisión y seguro no vienen en el listado; complétalos si aplica.
                </p>
              }

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
    .note {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0 0 0.5rem;
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
export class EmpleadoPensionFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly personaApi = inject(PersonaApiService);
  private readonly pensionApi = inject(EmpleadoPensionApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly personaId = signal(0);
  readonly personaLabel = signal('Persona');
  readonly empleadoId = signal(0);
  readonly pensionId = signal<number | null>(null);
  readonly isEdit = signal(false);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    tipo: this.fb.control<PensionTipo | null>(null, Validators.required),
    afpId: this.fb.control<number | null>(null),
    cuspp: this.fb.nonNullable.control<string>(''),
    porcentajeAporte: this.fb.control<number | null>(null),
    porcentajeComision: this.fb.control<number | null>(null),
    porcentajeSeguro: this.fb.control<number | null>(null),
  });

  constructor() {
    this.form.controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((t) => {
      const c = this.form.controls.afpId;
      if (t === 'AFP') {
        c.setValidators([Validators.required, Validators.min(1)]);
        c.updateValueAndValidity({ emitEvent: false });
      } else {
        c.clearValidators();
        c.setValue(null, { emitEvent: false });
        c.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] === 'edit' ? 'edit' : 'create';
    this.isEdit.set(mode === 'edit');

    const pidStr = this.route.snapshot.paramMap.get('personaId');
    const pid = pidStr ? Number(pidStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/rrhh/pension']);
      return;
    }
    this.personaId.set(pid);

    if (mode === 'edit') {
      const midStr = this.route.snapshot.paramMap.get('pensionId');
      const mid = midStr ? Number(midStr) : NaN;
      if (!Number.isFinite(mid) || mid < 1) {
        void this.router.navigate(['/rrhh/pension/personas', pid]);
        return;
      }
      this.pensionId.set(mid);
    }

    this.personaApi.obtenerPorId(pid).subscribe({
      next: (p) => {
        this.personaLabel.set(p.nombreCompleto);
        const eid = p.empleadoId != null && p.empleadoId > 0 ? p.empleadoId : 0;
        if (eid < 1) {
          this.snack.open('No hay empleado vinculado a esta persona.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/rrhh/pension']);
          return;
        }
        this.empleadoId.set(eid);
        if (mode === 'edit') {
          this.patchFromList(eid, this.pensionId()!);
        } else {
          this.pageLoading.set(false);
        }
      },
      error: (err: HttpErrorResponse) => this.onHttpFail(err, ['/rrhh/pension']),
    });
  }

  private patchFromList(empleadoId: number, targetId: number): void {
    this.pensionApi.listar(empleadoId).subscribe({
      next: (list) => {
        const row = list.find((r) => r.id === targetId);
        if (!row) {
          this.snack.open('No se encontró el registro solicitado.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/rrhh/pension/personas', this.personaId()]);
          return;
        }
        const tRaw = row.tipo?.trim().toUpperCase() ?? 'AFP';
        const tipo: PensionTipo = tRaw === 'ONP' ? 'ONP' : 'AFP';
        this.form.patchValue({
          tipo,
          afpId: row.afpId,
          cuspp: row.cuspp ?? '',
          porcentajeAporte: row.porcentajeAporte,
          porcentajeComision: null,
          porcentajeSeguro: null,
        });
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) =>
        this.onHttpFail(err, ['/rrhh/pension/personas', this.personaId()]),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const empId = this.empleadoId();
    if (empId < 1 || v.tipo == null) return;

    const body = {
      empleadoId: empId,
      afpId: v.tipo === 'AFP' ? v.afpId : null,
      tipo: v.tipo,
      cuspp: v.cuspp.trim().toUpperCase(),
      porcentajeAporte: v.porcentajeAporte,
      porcentajeComision: v.porcentajeComision,
      porcentajeSeguro: v.porcentajeSeguro,
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
    void this.router.navigate(['/rrhh/pension/personas', this.personaId()]);
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
