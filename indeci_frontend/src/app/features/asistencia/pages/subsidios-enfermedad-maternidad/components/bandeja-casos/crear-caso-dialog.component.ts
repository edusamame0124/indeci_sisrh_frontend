import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { PersonaApiService } from '../../../../../empleados/services/persona-api.service';
import type { PersonaResumen } from '../../../../../empleados/models/persona-empleado.model';
import { SubsidioApiService } from '../../services/subsidio-api.service';
import type { SubsidioCasoResponse, SubsidioTipoCaso } from '../../models/subsidio.models';

export type CrearCasoDialogResult = Pick<SubsidioCasoResponse, 'id'>;

@Component({
  selector: 'app-subsidio-crear-caso-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Registrar caso de subsidio</h2>
    <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content class="crear-caso__content">
        <mat-form-field appearance="outline" class="crear-caso__field">
          <mat-label>Empleado</mat-label>
          <input
            type="text"
            matInput
            [formControl]="empleadoCtrl"
            [matAutocomplete]="auto"
            placeholder="Nombre o DNI (mín. 2 caracteres)"
            required
          />
          <mat-autocomplete
            #auto="matAutocomplete"
            [displayWith]="displayEmpleado"
            (optionSelected)="onEmpleado($event.option.value)"
          >
            @for (p of empleadoOpciones(); track p.id) {
              <mat-option [value]="p">{{ p.nombreCompleto }} — DNI {{ p.dni }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <mat-form-field appearance="outline" class="crear-caso__field">
          <mat-label>Tipo de subsidio</mat-label>
          <mat-select formControlName="tipoCaso" required>
            <mat-option value="ENFERMEDAD">Enfermedad / incapacidad temporal</mat-option>
            <mat-option value="MATERNIDAD">Maternidad</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="crear-caso__row">
          <mat-form-field appearance="outline" class="crear-caso__field">
            <mat-label>Fecha contingencia</mat-label>
            <input matInput [matDatepicker]="dpCont" formControlName="fechaContingencia" required />
            <mat-datepicker-toggle matIconSuffix [for]="dpCont" />
            <mat-datepicker #dpCont />
          </mat-form-field>
          <mat-form-field appearance="outline" class="crear-caso__field">
            <mat-label>Fecha inicio descanso</mat-label>
            <input matInput [matDatepicker]="dpIni" formControlName="fechaInicio" required />
            <mat-datepicker-toggle matIconSuffix [for]="dpIni" />
            <mat-datepicker #dpIni />
          </mat-form-field>
          <mat-form-field appearance="outline" class="crear-caso__field">
            <mat-label>Fecha fin descanso</mat-label>
            <input matInput [matDatepicker]="dpFin" formControlName="fechaFin" required />
            <mat-datepicker-toggle matIconSuffix [for]="dpFin" />
            <mat-datepicker #dpFin />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="crear-caso__field">
          <mat-label>Observación (opcional)</mat-label>
          <textarea matInput rows="2" formControlName="observacion" maxlength="500"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="cancelar()" [disabled]="submitting()">Cancelar</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="submitting() || form.invalid || !empleado()">
          @if (submitting()) {
            <mat-spinner diameter="18" />
          } @else {
            Registrar borrador
          }
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .crear-caso__content { display: flex; flex-direction: column; gap: 4px; min-width: 480px; }
    .crear-caso__field { width: 100%; }
    .crear-caso__row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    @media (max-width: 640px) { .crear-caso__row { grid-template-columns: 1fr; } }
  `,
})
export class CrearCasoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SubsidioApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly dialogRef = inject(MatDialogRef<CrearCasoDialogComponent, CrearCasoDialogResult | null>);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly empleado = signal<PersonaResumen | null>(null);
  readonly empleadoOpciones = signal<readonly PersonaResumen[]>([]);
  readonly empleadoCtrl = this.fb.nonNullable.control('');

  readonly form = this.fb.nonNullable.group({
    tipoCaso: this.fb.nonNullable.control<SubsidioTipoCaso>('ENFERMEDAD', [Validators.required]),
    fechaContingencia: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    fechaInicio: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    fechaFin: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    observacion: this.fb.nonNullable.control(''),
  });

  constructor() {
    this.empleadoCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          const texto = q.trim();
          if (texto.length < 2) return of([] as readonly PersonaResumen[]);
          return this.personaApi.listarPaginado(0, 15, texto).pipe(
            map((page) => page.content.filter((p) => p.empleadoId != null)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((opts) => this.empleadoOpciones.set(opts));
  }

  displayEmpleado = (p: PersonaResumen | string | null): string => {
    if (!p || typeof p === 'string') return p ?? '';
    return `${p.nombreCompleto} — DNI ${p.dni ?? ''}`;
  };

  onEmpleado(p: PersonaResumen): void {
    this.empleado.set(p);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    const emp = this.empleado();
    if (!emp?.empleadoId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitting.set(true);
    this.api
      .crearCaso({
        empleadoId: emp.empleadoId,
        tipoCaso: raw.tipoCaso,
        fechaContingencia: this.toIso(raw.fechaContingencia),
        fechaInicio: this.toIso(raw.fechaInicio),
        fechaFin: this.toIso(raw.fechaFin),
        observacion: raw.observacion || null,
        modoCalculo: 'OFICIAL',
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.dialogRef.close({ id: res.id });
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          const body = err.error;
          const msg = isErrorResponse(body)
            ? this.errors.translate(body.mensaje)
            : this.errors.translate(null);
          this.snack.open(msg, 'Cerrar', { duration: 7000 });
        },
      });
  }

  private toIso(value: Date | null): string {
    if (!value) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
