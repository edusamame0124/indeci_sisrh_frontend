import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AuthService } from '../../../../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../../core/models/error-response.model';
import { SubsidioApiService } from '../../../services/subsidio-api.service';
import type { SubsidioCasoResponse, SubsidioCittResponse } from '../../../models/subsidio.models';
import { tienePermisoSubsidio } from '../../../utils/subsidio-calculo-display.utils';

@Component({
  selector: 'app-subsidio-tab-citt',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tab-panel" [class.tab-panel--operativo]="modo() === 'operativo'">
      @if (puedeEscribir()) {
        <div class="citt-form-panel">
          <h4 class="citt-form-panel__title">Registrar certificado</h4>
          <form [formGroup]="form" (ngSubmit)="registrar()" class="citt-form-panel__form">
            <div class="citt-form-panel__grid">
              <mat-form-field appearance="outline">
                <mat-label>Número CITT</mat-label>
                <input matInput formControlName="nroCitt" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha emisión</mat-label>
                <input matInput [matDatepicker]="dpEm" formControlName="fechaEmision" required />
                <mat-datepicker-toggle matIconSuffix [for]="dpEm" />
                <mat-datepicker #dpEm />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Inicio</mat-label>
                <input matInput [matDatepicker]="dpIni" formControlName="fechaInicio" required />
                <mat-datepicker-toggle matIconSuffix [for]="dpIni" />
                <mat-datepicker #dpIni />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fin</mat-label>
                <input matInput [matDatepicker]="dpFin" formControlName="fechaFin" required />
                <mat-datepicker-toggle matIconSuffix [for]="dpFin" />
                <mat-datepicker #dpFin />
              </mat-form-field>
            </div>
            <button mat-flat-button color="primary" type="submit" [disabled]="submitting() || form.invalid">
              @if (submitting()) {
                <mat-spinner diameter="18" />
              } @else {
                <ng-container>
                  <mat-icon>add_circle</mat-icon>
                  <span>Registrar CITT</span>
                </ng-container>
              }
            </button>
          </form>
        </div>
      }

      @if (loading()) {
        <div class="tab-panel__loading"><mat-spinner diameter="32" /></div>
      } @else if (citts().length === 0) {
        <div class="tab-panel__empty citt-empty">
          <mat-icon fontIcon="description" aria-hidden="true" />
          <p>No hay certificados CITT registrados para este caso.</p>
          @if (puedeEscribir()) {
            <small>Complete el formulario superior para registrar el sustento.</small>
          }
        </div>
      } @else {
        <div class="citt-table-wrap">
          <table mat-table [dataSource]="citts()" class="tab-panel__table" aria-label="Certificados CITT">
            <ng-container matColumnDef="nro">
              <th mat-header-cell *matHeaderCellDef>N° CITT</th>
              <td mat-cell *matCellDef="let row"><strong>{{ row.nroCitt }}</strong></td>
            </ng-container>
            <ng-container matColumnDef="emision">
              <th mat-header-cell *matHeaderCellDef>Emisión</th>
              <td mat-cell *matCellDef="let row">{{ row.fechaEmision }}</td>
            </ng-container>
            <ng-container matColumnDef="vigencia">
              <th mat-header-cell *matHeaderCellDef>Vigencia</th>
              <td mat-cell *matCellDef="let row">{{ row.fechaInicio }} — {{ row.fechaFin }}</td>
            </ng-container>
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let row">{{ row.estado }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columnas"></tr>
            <tr mat-row *matRowDef="let row; columns: columnas"></tr>
          </table>
        </div>
      }
      <p class="tab-panel__alert tab-panel__alert--info" role="note">
        @if (modo() === 'completo') {
          Los documentos clínicos se almacenan en legajo con acceso restringido. No se registran diagnósticos en el sistema.
        } @else {
          Registre el certificado CITT o sustento que respalda el descanso médico.
        }
      </p>
    </div>
  `,
  styles: `
    .tab-panel--operativo .citt-form-panel {
      padding: 16px;
      margin-bottom: 16px;
      border-radius: 10px;
      background: var(--sisrh-surface-muted, #f8fafc);
      border: 1px solid var(--sisrh-border-soft, #e7ecf2);
    }
    .citt-form-panel__title {
      margin: 0 0 12px;
      font-size: 13px;
      font-weight: 600;
      color: var(--sisrh-primary, #1f3a5f);
    }
    .citt-form-panel__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 12px;
      margin-bottom: 12px;
    }
    .citt-form-panel__form button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .citt-table-wrap {
      border: 1px solid var(--sisrh-border, #d9e1ea);
      border-radius: 8px;
      overflow: hidden;
    }
    .citt-empty small {
      color: var(--sisrh-text-muted, #64748b);
      font-size: 12px;
    }
    @media (max-width: 640px) {
      .citt-form-panel__grid { grid-template-columns: 1fr; }
    }
  `,
})
export class TabCittDocumentosComponent {
  readonly casoId = input.required<number>();
  readonly caso = input.required<SubsidioCasoResponse>();
  readonly modo = input<'operativo' | 'completo'>('completo');
  readonly casoActualizado = output<SubsidioCasoResponse>();

  private readonly api = inject(SubsidioApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly citts = signal<readonly SubsidioCittResponse[]>([]);
  readonly columnas = ['nro', 'emision', 'vigencia', 'estado'] as const;

  readonly puedeEscribir = () => tienePermisoSubsidio(this.auth.permisos(), 'SUB_WRITE');

  readonly form = this.fb.nonNullable.group({
    nroCitt: this.fb.nonNullable.control('', [Validators.required]),
    fechaEmision: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    fechaInicio: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    fechaFin: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
  });

  constructor() {
    effect(() => {
      const id = this.casoId();
      this.cargar(id);
    });
  }

  registrar(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.submitting.set(true);
    this.api
      .registrarCitt(this.casoId(), {
        nroCitt: raw.nroCitt,
        fechaEmision: this.toIso(raw.fechaEmision),
        fechaInicio: this.toIso(raw.fechaInicio),
        fechaFin: this.toIso(raw.fechaFin),
        accesoRestringido: 'S',
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.form.reset();
          this.snack.open('CITT registrado', 'Cerrar', { duration: 4000 });
          this.cargar(this.casoId());
          this.api.obtenerCaso(this.casoId()).subscribe({
            next: (c) => this.casoActualizado.emit(c),
          });
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.onError(err);
        },
      });
  }

  private cargar(casoId: number): void {
    this.loading.set(true);
    this.api
      .listarCitt(casoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.citts.set(rows);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.onError(err);
        },
      });
  }

  private onError(err: HttpErrorResponse): void {
    const msg = isErrorResponse(err.error)
      ? this.errors.translate(err.error.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }

  private toIso(value: Date | null): string {
    if (!value) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
