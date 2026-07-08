import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PersonaApiService } from '../../services/persona-api.service';
import { CatalogoApiService } from '../../services/catalogo-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { readApiErrorMessage } from '../../../../core/models/error-response.model';
import type { PersonaEmpleadoInput } from '../../models/persona-empleado.model';
import type { UbigeoOption } from '../../models/ubigeo.model';
import type { Sexo } from '../../../catalogos/models/sexo.model';
import type { EstadoCivil } from '../../../catalogos/models/estado-civil.model';
import type { TipoDocumento } from '../../../catalogos/models/tipo-documento.model';
import type { Profesion } from '../../../catalogos/models/profesion.model';
import type { GradoAcademico } from '../../../catalogos/models/grado-academico.model';

/** Payload al abrir el formulario persona en modal (lista). Rutas fullscreen siguen usando `ActivatedRoute`. */
export type PersonaFormDialogData =
  | { mode: 'create' }
  | { mode: 'edit'; editId: number };

/** Resultado al cerrar modal tras guardado o cancelación desde diálogo. */
export interface PersonaFormDialogResult {
  readonly saved: boolean;
  readonly id?: number;
}

@Component({
  selector: 'app-persona-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page" [class.page--dialog]="isDialogLayout">
      @if (isDialogLayout) {
        <header class="persona-dlg-header">
          <div class="persona-dlg-header__main">
            <span class="persona-dlg-header__icon" aria-hidden="true">
              <mat-icon>person_add</mat-icon>
            </span>
            <div class="persona-dlg-header__text">
              <h2
                mat-dialog-title
                class="persona-dlg-header__title"
                tabindex="-1"
                id="sisrh-persona-form-dlg-title"
              >
                {{ title() }}
              </h2>
              <p class="persona-dlg-header__subtitle">Completa los datos institucionales</p>
            </div>
          </div>
          <button
            type="button"
            mat-icon-button
            class="persona-dlg-header__close"
            mat-dialog-close
            aria-label="Cerrar"
            (click)="onCancel()"
          >
            <mat-icon>close</mat-icon>
          </button>
        </header>
      }

      @if (pageLoading()) {
        <div class="loading" [class.loading--dialog]="isDialogLayout">
          <mat-progress-spinner diameter="40" mode="indeterminate" />
        </div>
      } @else {
        <mat-card class="shell-card" [class.shell-card--dialog]="isDialogLayout">
          @if (!isDialogLayout) {
            <mat-card-header>
              <mat-card-title>{{ title() }}</mat-card-title>
              <mat-card-subtitle>Completa los datos institucionales</mat-card-subtitle>
            </mat-card-header>
          }
          <mat-card-content
            class="dlg-body"
            [class.persona-dlg-scroll]="isDialogLayout"
            [attr.tabindex]="isDialogLayout ? 0 : null"
          >
            <form
              [attr.id]="isDialogLayout ? 'sisrh-persona-form' : null"
              class="persona-form"
              [formGroup]="form"
              (ngSubmit)="onSubmit()"
              novalidate
            >
              @if (saveError()) {
                <p class="persona-form__alert" role="alert" aria-live="assertive">
                  {{ saveError() }}
                </p>
              }
              <section class="form-section persona-form__section" aria-labelledby="persona-sec-general">
                <h3 id="persona-sec-general" class="form-section__title">Datos generales</h3>
                <div class="form-section__fields">
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
                  <mat-label>Tipo de documento</mat-label>
                  <mat-select formControlName="tipoDocumentoId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (t of tiposDocumento(); track t.id) {
                      <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>DNI</mat-label>
                  <input
                    matInput
                    formControlName="dni"
                    maxlength="8"
                    inputmode="numeric"
                    autocomplete="off"
                    (input)="onDniInput($event)"
                  />
                  <mat-hint>8 dígitos numéricos</mat-hint>
                  @if (form.controls.dni.errors?.['required']) {
                    <mat-error>Ingresa el DNI</mat-error>
                  } @else if (form.controls.dni.errors?.['pattern']) {
                    <mat-error>El DNI debe tener exactamente 8 dígitos</mat-error>
                  } @else if (dniServerError()) {
                    <mat-error>{{ dniServerError() }}</mat-error>
                  }
                </mat-form-field>
              </div>

              <div class="row two">
                <mat-form-field appearance="outline">
                  <mat-label>RUC</mat-label>
                  <input
                    matInput
                    formControlName="ruc"
                    maxlength="11"
                    inputmode="numeric"
                    autocomplete="off"
                    (input)="onRucInput($event)"
                  />
                  <mat-hint>11 dígitos numéricos (opcional)</mat-hint>
                  @if (form.controls.ruc.errors?.['pattern']) {
                    <mat-error>El RUC debe tener exactamente 11 dígitos</mat-error>
                  }
                </mat-form-field>
              </div>

              <div class="row two">
                <mat-form-field appearance="outline">
                  <mat-label>Correo institucional</mat-label>
                  <input matInput type="email" formControlName="email" maxlength="150" autocomplete="email" />
                  <mat-hint>Ej. nombre&#64;entidad.gob.pe</mat-hint>
                  @if (form.controls.email.errors?.['required']) {
                    <mat-error>Ingresa el correo institucional</mat-error>
                  } @else if (form.controls.email.errors?.['pattern']) {
                    <mat-error>Formato inválido — Ej. nombre&#64;dominio.gob.pe</mat-error>
                  } @else if (emailServerError()) {
                    <mat-error>{{ emailServerError() }}</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Teléfono</mat-label>
                  <input matInput formControlName="telefono" maxlength="20" inputmode="tel" autocomplete="tel" />
                  <mat-hint>Ej. 987 654 321 (7–15 dígitos)</mat-hint>
                  @if (form.controls.telefono.errors?.['pattern']) {
                    <mat-error>Solo dígitos, espacios o guiones (7–15 caracteres)</mat-error>
                  }
                </mat-form-field>
              </div>
                </div>
              </section>

              <section class="form-section persona-form__section" aria-labelledby="persona-sec-demo">
                <h3 id="persona-sec-demo" class="form-section__title">Datos demográficos</h3>
                <div class="form-section__fields">
              <div class="row two">
                <mat-form-field appearance="outline">
                  <mat-label>Fecha de nacimiento</mat-label>
                  <input matInput type="date" formControlName="fechaNacimiento" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Sexo</mat-label>
                  <mat-select formControlName="sexoId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (s of sexos(); track s.id) {
                      <mat-option [value]="s.id">{{ s.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="row two">
                <mat-form-field appearance="outline">
                  <mat-label>Estado civil</mat-label>
                  <mat-select formControlName="estadoCivilId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (e of estadosCiviles(); track e.id) {
                      <mat-option [value]="e.id">{{ e.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
                </div>
              </section>

              <section class="form-section persona-form__section" aria-labelledby="persona-sec-formacion">
                <h3 id="persona-sec-formacion" class="form-section__title">Formación académica</h3>
                <div class="form-section__fields">
              <div class="row two">
                <mat-form-field appearance="outline">
                  <mat-label>Profesión</mat-label>
                  <mat-select formControlName="profesionId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (p of profesiones(); track p.id) {
                      <mat-option [value]="p.id">{{ p.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Grado académico</mat-label>
                  <mat-select formControlName="gradoAcademicoId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (g of gradosAcademicos(); track g.id) {
                      <mat-option [value]="g.id">{{ g.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
                </div>
              </section>

              <section class="form-section persona-form__section" aria-labelledby="persona-sec-ubicacion">
                <h3 id="persona-sec-ubicacion" class="form-section__title">Ubicación y estado</h3>
                <div class="form-section__fields">
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

              <div class="row two">
                <mat-form-field appearance="outline">
                  <mat-label>Código interno</mat-label>
                  <input matInput formControlName="codigoInterno" maxlength="32" autocomplete="off" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Estado laboral</mat-label>
                  <mat-select formControlName="estado">
                    <mat-option value="ACTIVO">ACTIVO</mat-option>
                    <mat-option value="INACTIVO">INACTIVO</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
                </div>
              </section>

              @if (!isDialogLayout) {
                <div class="actions">
                  <button mat-button type="button" (click)="onCancel()">Cancelar</button>
                  <button
                    mat-flat-button
                    color="primary"
                    type="submit"
                    [disabled]="saving()"
                    class="actions__submit"
                  >
                    @if (saving()) {
                      Guardando...
                    } @else {
                      {{ submitLabel() }}
                    }
                  </button>
                </div>
              }
            </form>
          </mat-card-content>
        </mat-card>
        @if (isDialogLayout) {
          <mat-dialog-actions align="end" class="persona-dlg-footer">
            <button mat-button type="button" (click)="onCancel()">Cancelar</button>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              form="sisrh-persona-form"
              [disabled]="saving()"
              class="actions__submit"
            >
              @if (saving()) {
                Guardando...
              } @else {
                {{ submitLabel() }}
              }
            </button>
          </mat-dialog-actions>
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: var(--sisrh-spacing-md, 0.875rem);
        max-width: 680px;
        margin: 0 auto;
        font-family: var(--sisrh-font-sans, sans-serif);
      }
      :host-context(.sisrh-dialog-shell--large) {
        display: block;
        padding: 0;
        max-width: none;
        margin: 0;
      }
      .page--dialog {
        display: flex;
        flex-direction: column;
        min-height: 0;
        max-height: 92vh;
        padding: 0;
        max-width: none;
        margin: 0;
        background: #fff;
      }
      .persona-dlg-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-shrink: 0;
        padding: 18px 20px 14px;
        background: linear-gradient(180deg, #f1f5f9 0%, #fff 72%);
        border-bottom: 1px solid var(--sisrh-color-border, #e2e8f0);
      }
      .persona-dlg-header__main {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        min-width: 0;
        flex: 1;
      }
      .persona-dlg-header__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--sisrh-color-cta, #0369a1) 14%, #fff);
        color: var(--sisrh-color-cta, #0369a1);
      }
      .persona-dlg-header__icon mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
      .persona-dlg-header__text {
        min-width: 0;
      }
      .persona-dlg-header__title {
        margin: 0;
        padding: 0;
        border: none;
        background: transparent;
        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.3;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.02em;
      }
      .persona-dlg-header__subtitle {
        margin: 4px 0 0;
        font-size: 0.8125rem;
        line-height: 1.45;
        color: var(--sisrh-color-muted, #64748b);
      }
      .persona-dlg-header__close {
        flex-shrink: 0;
        margin: -6px -8px 0 0;
        color: var(--sisrh-color-muted, #64748b);
      }
      .persona-dlg-scroll {
        flex: 1;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        padding: 16px 20px 8px;
        background: var(--sisrh-color-background, #f8fafc);
        scrollbar-gutter: stable;
      }
      .persona-dlg-scroll::-webkit-scrollbar {
        width: 8px;
      }
      .persona-dlg-scroll::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      .persona-form__alert {
        margin: 0 0 1rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        line-height: 1.45;
        font-weight: 500;
        color: var(--sisrh-color-error, #b42318);
        background: #fef2f2;
        border: 1px solid #fecaca;
      }

      .persona-form__section.form-section {
        margin: 0 0 14px;
        padding: 14px 16px 6px;
        border: 1px solid var(--sisrh-color-border, #e2e8f0);
        border-radius: var(--sisrh-radius-md, 8px);
        background: #fff;
        box-shadow: var(--sisrh-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
      }
      .persona-form__section .form-section__title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 12px;
        padding: 0 0 10px;
        border-bottom: 1px solid var(--sisrh-color-border-soft, #e7ecf2);
        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
      }
      .persona-form__section .form-section__title::before {
        content: '';
        flex-shrink: 0;
        width: 4px;
        height: 1em;
        border-radius: 2px;
        background: var(--sisrh-color-cta, #0369a1);
      }
      .form-section__fields {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .persona-dlg-footer {
        flex-shrink: 0;
        margin: 0;
        min-height: 60px;
        padding: 12px 20px 16px !important;
        background: #fff;
        border-top: 1px solid var(--sisrh-color-border, #e2e8f0);
        box-shadow: 0 -6px 16px rgba(15, 23, 42, 0.06);
      }
      .persona-dlg-footer .mat-mdc-button,
      .persona-dlg-footer .mat-mdc-unelevated-button {
        min-height: 42px;
      }
      .loading--dialog {
        padding: 3rem 1.5rem;
      }
      .dlg-heading {
        margin: 0 0 0.5rem;
        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);
        font-size: 1rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.02em;
      }
      .shell-card {
        box-shadow: none;
        border: 1px solid #e2e8f0;
      }
      .shell-card--dialog {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        border: none;
        box-shadow: none;
        background: transparent;
      }
      .shell-card--dialog mat-card-content.persona-dlg-scroll {
        flex: 1;
        min-height: 0;
        padding: 0;
        margin: 0;
      }
      .dlg-body {
        max-height: calc(88vh - 6.5rem);
        overflow-y: auto;
        padding-right: 0.25rem;
      }
      .page--dialog .dlg-body {
        flex: 1;
        min-height: 0;
        max-height: none;
      }
      @media (prefers-reduced-motion: reduce) {
        .dlg-body {
          scroll-behavior: auto;
        }
      }
      .row {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .row.two {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem 12px;
      }
      .page--dialog .row.two {
        gap: 0.5rem 12px;
      }
      .section {
        margin: 0.65rem 0 0.35rem;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 0.2rem;
      }
      .section:first-of-type {
        margin-top: 0;
      }
      @media (max-width: 719px) {
        .row.two {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 600px) {
        .page--dialog {
          max-height: none;
          min-height: calc(92vh - 0.5rem);
        }
        .persona-dlg-header {
          padding: 14px 16px 12px;
        }
        .persona-dlg-scroll {
          padding: 12px 14px 6px;
        }
        .persona-dlg-footer .mat-mdc-button,
        .persona-dlg-footer .mat-mdc-unelevated-button {
          min-height: 44px;
        }
      }
      .actions {
        margin-top: 0.75rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
        justify-content: flex-end;
      }
      .actions > :first-child {
        margin-right: auto;
      }
      .actions__submit {
        min-height: 40px;
        transition: opacity 0.2s ease;
      }
      .actions__submit:hover:not([disabled]) {
        opacity: 0.92;
      }
      .actions__submit:focus-visible {
        outline: 3px solid var(--sisrh-color-cta, #0369a1);
        outline-offset: 2px;
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
  /** Presente sólo cuando el componente se abre desde `MatDialog`. */
  private readonly dialogShell = inject(MatDialogRef<PersonaFormPageComponent, PersonaFormDialogResult | undefined>, {
    optional: true,
  });
  private readonly dialogPayload = inject<PersonaFormDialogData | undefined>(MAT_DIALOG_DATA, {
    optional: true,
  });

  /** `true` si el formulario se muestra en modal (listado). */
  readonly isDialogLayout = this.dialogShell != null;

  readonly form = this.fb.group({
    nombreCompleto: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(240)]),
    dni: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]),
    ruc: this.fb.nonNullable.control('', [
      Validators.pattern(/^[0-9]{11}$/),
    ]),
    email: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/),
    ]),
    telefono: this.fb.nonNullable.control('', [
      Validators.pattern(/^[+]?[\d\s\-]{7,15}$/),
    ]),
    direccion: this.fb.nonNullable.control(''),
    distritoId: this.fb.nonNullable.control('', Validators.required),
    codigoInterno: this.fb.nonNullable.control(''),
    estado: this.fb.nonNullable.control('ACTIVO', Validators.required),
    fechaNacimiento: this.fb.control<string | null>(null),
    sexoId: this.fb.nonNullable.control<number | null>(null),
    estadoCivilId: this.fb.nonNullable.control<number | null>(null),
    tipoDocumentoId: this.fb.nonNullable.control<number | null>(null),
    profesionId: this.fb.nonNullable.control<number | null>(null),
    gradoAcademicoId: this.fb.nonNullable.control<number | null>(null),
  });

  private readonly editId = signal<number | null>(null);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly dniServerError = signal<string | null>(null);
  readonly emailServerError = signal<string | null>(null);
  readonly ubigeos = signal<readonly UbigeoOption[]>([]);
  readonly sexos = signal<readonly Sexo[]>([]);
  readonly estadosCiviles = signal<readonly EstadoCivil[]>([]);
  readonly tiposDocumento = signal<readonly TipoDocumento[]>([]);
  readonly profesiones = signal<readonly Profesion[]>([]);
  readonly gradosAcademicos = signal<readonly GradoAcademico[]>([]);

  readonly title = computed(() =>
    this.editId() !== null ? 'Editar persona / empleado' : 'Registrar persona',
  );

  readonly submitLabel = computed(() =>
    this.editId() !== null ? 'Actualizar datos' : 'Registrar',
  );

  ngOnInit(): void {
    const payload = this.dialogPayload;
    if (payload?.mode === 'edit') {
      const idNum = payload.editId;
      if (!Number.isFinite(idNum) || idNum < 1) {
        this.quitShellOrRoute();
        return;
      }
      this.editId.set(idNum);
      this.form.controls.dni.disable({ emitEvent: false });
      this.loadCatalogs(() => this.loadPerson(idNum));
      return;
    }
    if (payload?.mode === 'create') {
      this.editId.set(null);
      this.form.controls.dni.enable({ emitEvent: false });
      this.loadCatalogs(() => this.pageLoading.set(false));
      return;
    }

    const mode = this.route.snapshot.data['mode'] as string | undefined;
    const editIdRaw = this.route.snapshot.paramMap.get('id');

    if (mode === 'edit' && editIdRaw) {
      const idNum = Number(editIdRaw);
      if (!Number.isFinite(idNum) || idNum < 1) {
        void this.router.navigate(['/empleados/personas']);
        return;
      }
      this.editId.set(idNum);
      this.form.controls.dni.disable({ emitEvent: false });
      this.loadCatalogs(() => this.loadPerson(idNum));
      return;
    }

    if (mode !== 'create') {
      void this.router.navigate(['/empleados/personas']);
      return;
    }

    this.editId.set(null);
    this.loadCatalogs(() => this.pageLoading.set(false));
  }

  onDniInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[^0-9]/g, '').slice(0, 8);
    if (input.value !== clean) {
      input.value = clean;
      this.form.controls.dni.setValue(clean, { emitEvent: true });
    }
  }

  onRucInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[^0-9]/g, '').slice(0, 11);
    if (input.value !== clean) {
      input.value = clean;
      this.form.controls.ruc.setValue(clean, { emitEvent: true });
    }
  }

  onCancel(): void {
    this.dialogShell?.close(undefined);
    if (!this.dialogShell) {
      void this.router.navigate(['/empleados/personas']);
    }
  }

  ubigeoLabel(o: UbigeoOption): string {
    return `${o.departamento} › ${o.provincia} › ${o.distrito} (${o.id})`;
  }

  onSubmit(): void {
    if (this.saving()) return;
    this.clearServerErrors();
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      this.snack.open('Revisa los campos obligatorios.', 'Cerrar', { duration: 4500 });
      return;
    }
    const id = this.editId();
    const body = this.rawToInput(this.form.getRawValue());

    if (id === null) this.create(body);
    else this.update(id, body);
  }

  private rawToInput(v: ReturnType<PersonaFormPageComponent['form']['getRawValue']>): PersonaEmpleadoInput {
    return {
      nombreCompleto: v.nombreCompleto.trim(),
      dni: v.dni.trim(),
      ruc: v.ruc.trim(),
      email: v.email.trim().toLowerCase(),
      telefono: v.telefono,
      direccion: v.direccion.trim().toUpperCase(),
      distritoId: v.distritoId,
      codigoInterno: v.codigoInterno.trim(),
      estado: v.estado,
      fechaNacimiento: v.fechaNacimiento ? v.fechaNacimiento : null,
      sexoId: v.sexoId,
      estadoCivilId: v.estadoCivilId,
      tipoDocumentoId: v.tipoDocumentoId,
      profesionId: v.profesionId,
      gradoAcademicoId: v.gradoAcademicoId,
    };
  }

  private create(body: PersonaEmpleadoInput): void {
    this.saving.set(true);
    this.api.guardar(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Registro guardado correctamente.', 'Cerrar', { duration: 4000 });
        if (this.dialogShell) {
          this.dialogShell.close({ saved: true });
        } else {
          void this.router.navigate(['/empleados/personas']);
        }
      },
      error: (err: HttpErrorResponse) => this.onSaveFail(err),
    });
  }

  private update(id: number, body: PersonaEmpleadoInput): void {
    this.saving.set(true);
    this.api.actualizar(id, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Datos actualizados correctamente.', 'Cerrar', { duration: 4000 });
        if (this.dialogShell) {
          this.dialogShell.close({ saved: true, id });
        } else {
          void this.router.navigate(['/empleados/personas', String(id)]);
        }
      },
      error: (err: HttpErrorResponse) => this.onSaveFail(err),
    });
  }

  private loadCatalogs(onDone: () => void): void {
    forkJoin({
      ubigeo: this.catalogos.listarUbigeo(),
      sexos: this.catalogos.listarSexos(),
      estadosCiviles: this.catalogos.listarEstadosCiviles(),
      tiposDocumento: this.catalogos.listarTiposDocumento(),
      profesiones: this.catalogos.listarProfesiones(),
      gradosAcademicos: this.catalogos.listarGradosAcademicos(),
    }).subscribe({
      next: (res) => {
        this.ubigeos.set(this.sortUbigeo(res.ubigeo));
        this.sexos.set(res.sexos);
        this.estadosCiviles.set(res.estadosCiviles);
        this.tiposDocumento.set(res.tiposDocumento);
        this.profesiones.set(res.profesiones);
        this.gradosAcademicos.set(res.gradosAcademicos);
        onDone();
      },
      error: (err: HttpErrorResponse) => this.onBootFail(err),
    });
  }

  private loadPerson(id: number): void {
    this.api.obtenerPorId(id).subscribe({
      next: (p) => {
        const dniTxt = String(p.dni ?? '');
        this.form.patchValue({
          nombreCompleto: p.nombreCompleto,
          dni: dniTxt,
          ruc: (p.ruc ?? '').trim(),
          email: p.email ?? '',
          telefono: (p.telefono ?? '').trim(),
          direccion: (p.direccion ?? '').trim(),
          distritoId: String(p.distritoId ?? ''),
          codigoInterno: (p.codigoInterno ?? '').trim(),
          estado: (p.estado ?? 'ACTIVO').toUpperCase() === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
          fechaNacimiento: p.fechaNacimiento ? p.fechaNacimiento.substring(0, 10) : null,
          sexoId: p.sexoId ?? null,
          estadoCivilId: p.estadoCivilId ?? null,
          tipoDocumentoId: p.tipoDocumentoId ?? null,
          profesionId: p.profesionId ?? null,
          gradoAcademicoId: p.gradoAcademicoId ?? null,
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
    const msg = this.resolveHttpError(err);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
    this.quitShellOrRoute();
  }

  /** Cierra modal si aplica; si no, navega al listado. */
  private quitShellOrRoute(): void {
    this.dialogShell?.close(undefined);
    if (!this.dialogShell) {
      void this.router.navigate(['/empleados/personas']);
    }
  }

  private onSaveFail(err: HttpErrorResponse): void {
    this.saving.set(false);
    const raw = readApiErrorMessage(err.error);
    const msg = this.errors.translate(raw);
    this.saveError.set(msg);
    this.applyFieldErrorsFromMessage(raw, msg);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }

  private resolveHttpError(err: HttpErrorResponse): string {
    return this.errors.translate(readApiErrorMessage(err.error));
  }

  private clearServerErrors(): void {
    this.saveError.set(null);
    this.dniServerError.set(null);
    this.emailServerError.set(null);
    this.clearControlServerError('dni');
    this.clearControlServerError('email');
  }

  private clearControlServerError(name: 'dni' | 'email'): void {
    const ctrl = this.form.controls[name];
    if (!ctrl.errors?.['server']) return;
    const { server: _removed, ...rest } = ctrl.errors;
    ctrl.setErrors(Object.keys(rest).length > 0 ? rest : null);
  }

  private applyFieldErrorsFromMessage(raw: string | null, uiMessage: string): void {
    if (!raw) return;
    const lower = raw.toLowerCase();
    if (lower.includes('dni')) {
      this.dniServerError.set(uiMessage);
      this.form.controls.dni.setErrors({ server: true }, { emitEvent: false });
      this.form.controls.dni.markAsTouched();
    }
    if (lower.includes('email') || lower.includes('correo')) {
      this.emailServerError.set(uiMessage);
      this.form.controls.email.setErrors({ server: true }, { emitEvent: false });
      this.form.controls.email.markAsTouched();
    }
  }
}
