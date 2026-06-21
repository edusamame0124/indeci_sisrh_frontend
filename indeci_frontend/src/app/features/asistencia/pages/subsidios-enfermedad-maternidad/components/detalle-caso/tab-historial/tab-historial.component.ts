import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ErrorMessageService } from '../../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../../core/models/error-response.model';
import { SubsidioApiService } from '../../../services/subsidio-api.service';
import type { SubsidioValidacion } from '../../../models/subsidio.models';
import {
  labelEstadoCaso,
  labelSeveridadValidacion,
  severidadVariant,
} from '../../../utils/subsidio-calculo-display.utils';

@Component({
  selector: 'app-subsidio-tab-historial',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tab-panel">
      @if (modo() === 'completo') {
        <h3 class="tab-panel__section-title">Validaciones del caso</h3>
      } @else {
        <h3 class="tab-panel__section-title">Alertas críticas del caso</h3>
      }
      @if (loading()) {
        <div class="tab-panel__loading"><mat-spinner diameter="32" /></div>
      } @else if (validacionesFiltradas().length === 0) {
        <p class="tab-panel__empty-text">
          {{ modo() === 'compacto' ? 'No hay alertas críticas registradas.' : 'Sin validaciones registradas.' }}
        </p>
      } @else if (modo() === 'compacto') {
        <ul class="val-list" aria-label="Alertas críticas">
          @for (row of validacionesFiltradas(); track row.codigo + row.mensaje) {
            <li
              class="val-list__item"
              [class.val-list__item--danger]="severidad(row.severidad) === 'danger'"
              [class.val-list__item--warn]="severidad(row.severidad) === 'warning'"
            >
              <strong>{{ labelSeveridad(row.severidad) }}:</strong> {{ row.mensaje }}
            </li>
          }
        </ul>
      } @else {
        <table mat-table [dataSource]="validacionesFiltradas()" class="tab-panel__table" aria-label="Validaciones">
          <ng-container matColumnDef="severidad">
            <th mat-header-cell *matHeaderCellDef>Severidad</th>
            <td mat-cell *matCellDef="let row">
              <span
                class="val-badge"
                [class.val-badge--danger]="severidad(row.severidad) === 'danger'"
                [class.val-badge--warn]="severidad(row.severidad) === 'warning'"
                [class.val-badge--info]="severidad(row.severidad) === 'info'"
              >{{ labelSeveridad(row.severidad) }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="mensaje">
            <th mat-header-cell *matHeaderCellDef>Mensaje</th>
            <td mat-cell *matCellDef="let row">{{ row.mensaje }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columnasVal"></tr>
          <tr mat-row *matRowDef="let row; columns: columnasVal"></tr>
        </table>
      }
      @if (modo() === 'completo') {
        <p class="tab-panel__alert tab-panel__alert--info" role="note">
          El historial de cambios de campos críticos estará disponible en la fase de administración (P1).
        </p>
      }
    </div>
  `,
  styles: `
    .tab-panel__section-title { margin: 0 0 12px; font-size: 15px; font-weight: 600; }
    .tab-panel__empty-text { color: #64748b; font-size: 13px; }
    .val-badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .val-badge--danger { background: #fdecec; color: #b42318; }
    .val-badge--warn { background: #fff4db; color: #b7791f; }
    .val-badge--info { background: #e8eef6; color: #1f3a5f; }
    .val-list { margin: 0; padding: 0; list-style: none; }
    .val-list__item {
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 8px;
      background: #e8eef6;
      color: #1f3a5f;
    }
    .val-list__item--danger { background: #fdecec; color: #b42318; }
    .val-list__item--warn { background: #fff4db; color: #92400e; }
  `,
})
export class TabHistorialComponent {
  readonly casoId = input.required<number>();
  readonly modo = input<'compacto' | 'completo'>('completo');
  readonly validacionesExternas = input<readonly SubsidioValidacion[] | null>(null);

  private readonly api = inject(SubsidioApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly validaciones = signal<readonly SubsidioValidacion[]>([]);
  readonly columnasVal = ['severidad', 'mensaje'] as const;
  readonly severidad = severidadVariant;
  readonly labelSeveridad = labelSeveridadValidacion;
  readonly labelEstado = labelEstadoCaso;

  readonly validacionesFiltradas = computed(() => {
    const rows = this.validaciones();
    if (this.modo() === 'completo') return rows;
    return rows.filter((v) => v.severidad === 'BLOQUEO' || v.severidad === 'ALERTA');
  });

  constructor() {
    effect(() => {
      const ext = this.validacionesExternas();
      if (ext) {
        this.validaciones.set(ext);
        this.loading.set(false);
        return;
      }
      this.cargar(this.casoId());
    });
  }

  private cargar(casoId: number): void {
    this.loading.set(true);
    this.api
      .validaciones(casoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.validaciones.set(rows);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          const msg = isErrorResponse(err.error)
            ? this.errors.translate(err.error.mensaje)
            : this.errors.translate(null);
          this.snack.open(msg, 'Cerrar', { duration: 7000 });
        },
      });
  }
}
