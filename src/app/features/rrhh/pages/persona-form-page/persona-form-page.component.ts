import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PersonaApiService } from '../../services/persona-api.service';
import { CatalogoApiService } from '../../services/catalogo-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleadoInput } from '../../models/persona-empleado.model';
import type { UbigeoOption } from '../../models/ubigeo.model';

@Component({
  selector: 'app-persona-form-page',
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
      <a mat-button routerLink="/rrhh/personas">Cancelar</a>

      @if (pageLoading()) {
        <div class="loading"><mat-progress-spinner diameter="40" mode="indeterminate" /></div>
      } @else {
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ title() }}</mat-card-title>
            <mat-card-subtitle>Completa los datos institucionales</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Nombre completo</mat-label>
                <input matInput formControlName="nombreCompleto" maxlength="240" autocomplete="name" />
                @if (form.controls.nombreCompleto.hasError('required')) {
                  <mat-error>Ingresa el nombre completo</mat-error>
                }
              </mat-form-field>
            </div>
            <div class="row two">
              <mat-form-field appearance="outline">
                <mat-label>DNI</mat-label>
                <input
                  matInput
                  formControlName="dni"
                  maxlength="8"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  autocomplete="off"
                />
                <mat-hint>8 dígitos</mat-hint>
                @if (form.controls.dni.errors?.['required']) {
                  <mat-error>Ingresa el DNI</mat-error>
                } @else if (form.controls.dni.errors?.['pattern']) {
                  <mat-error>El DNI debe tener exactamente 8 dígitos</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Correo institucional</mat-label>
                <input matInput type="email" formControlName="email" autocomplete="email" />
                @if (form.controls.email.errors?.['required']) {
                  <mat-error>Ingresa el correo</mat-error>
                } @else if (form.controls.email.errors?.['email']) {
                  <mat-error>Correo no válido</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="row two">
              <mat-form-field appearance="outline">
                <mat-label>Teléfono</mat-label>
                <input matInput formControlName="telefono" maxlength="20" autocomplete="tel" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Estado laboral</mat-label>
                <mat-select formControlName="estado">
                  <mat-option value="ACTIVO">ACTIVO</mat-option>
                  <mat-option value="INACTIVO">INACTIVO</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Dirección</mat-label>
                <textarea matInput formControlName="direccion" rows="3" maxlength="500"></textarea>
              </mat-form-field>
            </div>

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Distrito (Ubigeo)</mat-label>
                <mat-select formControlName="distritoId">
                  @for (o of ubigeos(); track o.id) {
                    <mat-option [value]="o.id">{{ ubigeoLabel(o) }}</mat-option>
                  }
                </mat-select>
                @if (form.controls.distritoId.hasError('required')) {
                  <mat-error>Selecciona distrito</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Código interno</mat-label>
                <input matInput formControlName="codigoInterno" maxlength="32" autocomplete="off" />
              </mat-form-field>
            </div>

            <div class="actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
                @if (saving()) {
                  Guardando...
                } @else {
                  {{ submitLabel() }}
                }
              </button>
            </div>
            </form>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 1rem;
        max-width: 720px;
        margin: 0 auto;
        font-family: var(--sisrh-font-sans, sans-serif);
      }
      .row {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .row.two {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
      @media (max-width: 719px) {
        .row.two {
          grid-template-columns: 1fr;
        }
      }
      .actions {
        margin-top: 1rem;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      mat-form-field {
        width: 100%;
      }
    `,
  ],
})
export class PersonaFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PersonaApiService);
  private readonly catalogos = inject(CatalogoApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly form = this.fb.nonNullable.group({
    nombreCompleto: ['', [Validators.required, Validators.maxLength(240)]],
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    direccion: [''],
    distritoId: ['', Validators.required],
    codigoInterno: [''],
    estado: ['ACTIVO', Validators.required],
  });

  private readonly editId = signal<number | null>(null);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);
  readonly ubigeos = signal<readonly UbigeoOption[]>([]);

  readonly title = computed(() =>
    this.editId() !== null ? 'Editar persona / empleado' : 'Registrar persona',
  );

  readonly submitLabel = computed(() =>
    this.editId() !== null ? 'Actualizar datos' : 'Registrar',
  );

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] as string | undefined;
    const editIdRaw = this.route.snapshot.paramMap.get('id');

    if (mode === 'edit' && editIdRaw) {
      const idNum = Number(editIdRaw);
      if (!Number.isFinite(idNum) || idNum < 1) {
        void this.router.navigate(['/rrhh/personas']);
        return;
      }
      this.editId.set(idNum);
      this.form.controls.dni.disable({ emitEvent: false });
      this.catalogos.listarUbigeo().subscribe({
        next: (u) => {
          this.ubigeos.set(this.sortUbigeo(u));
          this.loadPerson(idNum);
        },
        error: (err: HttpErrorResponse) => this.onBootFail(err),
      });
      return;
    }

    if (mode !== 'create') {
      void this.router.navigate(['/rrhh/personas']);
      return;
    }

    this.editId.set(null);
    this.catalogos.listarUbigeo().subscribe({
      next: (u) => {
        this.ubigeos.set(this.sortUbigeo(u));
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => this.onBootFail(err),
    });
  }

  ubigeoLabel(o: UbigeoOption): string {
    return `${o.departamento} › ${o.provincia} › ${o.distrito} (${o.id})`;
  }

  onSubmit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      this.snack.open('Revisa los campos obligatorios.', 'Cerrar', { duration: 4500 });
      return;
    }
    const id = this.editId();
    const body = this.rawToInput(
      this.form.getRawValue() as {
        nombreCompleto: string;
        dni: string;
        email: string;
        telefono: string;
        direccion: string;
        distritoId: string;
        codigoInterno: string;
        estado: string;
      },
    );

    if (id === null) this.create(body);
    else this.update(id, body);
  }

  private rawToInput(v: Record<string, string>): PersonaEmpleadoInput {
    return {
      nombreCompleto: v['nombreCompleto']?.trim() ?? '',
      dni: (v['dni'] ?? '').trim(),
      email: (v['email'] ?? '').trim().toLowerCase(),
      telefono: v['telefono'] ?? '',
      direccion: (v['direccion'] ?? '').trim().toUpperCase(),
      distritoId: v['distritoId'] ?? '',
      codigoInterno: (v['codigoInterno'] ?? '').trim(),
      estado: v['estado'] ?? 'ACTIVO',
    };
  }

  private create(body: PersonaEmpleadoInput): void {
    this.saving.set(true);
    this.api.guardar(body).subscribe({
      next: () => {
        this.snack.open('Registro guardado correctamente.', 'Cerrar', { duration: 4000 });
        void this.router.navigate(['/rrhh/personas']);
      },
      error: (err: HttpErrorResponse) => this.onSaveFail(err),
    });
  }

  private update(id: number, body: PersonaEmpleadoInput): void {
    this.saving.set(true);
    this.api.actualizar(id, body).subscribe({
      next: () => {
        this.snack.open('Datos actualizados correctamente.', 'Cerrar', { duration: 4000 });
        void this.router.navigate(['/rrhh/personas', String(id)]);
      },
      error: (err: HttpErrorResponse) => this.onSaveFail(err),
    });
  }

  private loadPerson(id: number): void {
    this.api.obtenerPorId(id).subscribe({
      next: (p) => {
        const dniTxt = String(p.dni ?? '');
        this.form.patchValue({
          nombreCompleto: p.nombreCompleto,
          dni: dniTxt,
          email: p.email,
          telefono: (p.telefono ?? '').trim(),
          direccion: (p.direccion ?? '').trim(),
          distritoId: String(p.distritoId ?? ''),
          codigoInterno: (p.codigoInterno ?? '').trim(),
          estado: (p.estado ?? 'ACTIVO').toUpperCase() === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
        });
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => this.onBootFail(err),
    });
  }

  private sortUbigeo(rows: readonly UbigeoOption[]): readonly UbigeoOption[] {
    return [...rows].sort((a, b) =>
      `${a.departamento}${a.provincia}${a.distrito}`.localeCompare(
        `${b.departamento}${b.provincia}${b.distrito}`,
        'es-PE',
      ),
    );
  }

  private onBootFail(err: HttpErrorResponse): void {
    this.pageLoading.set(false);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
    void this.router.navigate(['/rrhh/personas']);
  }

  private onSaveFail(err: HttpErrorResponse): void {
    this.saving.set(false);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
