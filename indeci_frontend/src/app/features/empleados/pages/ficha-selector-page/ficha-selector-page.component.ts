import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, of } from 'rxjs';
import { PersonaApiService } from '../../services/persona-api.service';
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';

@Component({
  selector: 'app-ficha-selector-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page sisrh-page">
      <nav class="crumbs sisrh-crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__group">Empleados</span>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">Ficha 360</span>
      </nav>

      <mat-card class="page-card sisrh-elevated">
        <mat-card-header>
          <mat-card-title>Ficha 360 del empleado</mat-card-title>
          <mat-card-subtitle>Selecciona el empleado y el período a consultar.</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (loading()) {
            <div class="page-loading" aria-busy="true">
              <mat-progress-spinner mode="indeterminate" diameter="48" />
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="navegar()" class="selector-form">
              <mat-form-field appearance="outline" class="field-full">
                <mat-label>Empleado</mat-label>
                <mat-select formControlName="empleadoId">
                  @for (p of personas(); track p.empleadoId) {
                    <mat-option [value]="p.empleadoId">
                      {{ p.nombreCompleto }} — {{ p.dni }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="field-full">
                <mat-label>Período</mat-label>
                <mat-select formControlName="periodo">
                  @for (p of periodos(); track p.periodo) {
                    <mat-option [value]="p.periodo">
                      {{ p.periodo }} — {{ p.estado }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <div class="form-actions">
                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="form.invalid">
                  Ver Ficha 360
                </button>
              </div>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .selector-form { display: flex; flex-direction: column; gap: 16px; padding-top: 16px; max-width: 480px; }
    .field-full { width: 100%; }
    .form-actions { display: flex; justify-content: flex-end; }
    .page-loading { display: flex; justify-content: center; padding: 48px; }
  `],
})
export class FichaSelectorPageComponent {
  private readonly personaApi = inject(PersonaApiService);
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly personas = signal<readonly PersonaEmpleado[]>([]);
  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);

  readonly form = this.fb.group({
    empleadoId: this.fb.control<number | null>(null, Validators.required),
    periodo:    this.fb.control<string | null>(null, Validators.required),
  });

  constructor() {
    forkJoin({
      personas: this.personaApi.listar().pipe(catchError(() => of([] as readonly PersonaEmpleado[]))),
      periodos: this.periodoApi.listar().pipe(catchError(() => of([] as readonly PeriodoPlanillaRow[]))),
    }).subscribe(({ personas, periodos }) => {
      this.personas.set(personas.filter(p => p.empleadoId != null));
      this.periodos.set([...periodos].reverse());
      this.loading.set(false);
    });
  }

  navegar(): void {
    const { empleadoId, periodo } = this.form.getRawValue();
    if (!empleadoId || !periodo) return;
    this.router.navigate(['/empleados/ficha', empleadoId, periodo]);
  }
}
