import {
  ChangeDetectionStrategy,
  Component,
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
import { ErrorMessageService } from '../../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../../core/models/error-response.model';
import { SubsidioApiService } from '../../../services/subsidio-api.service';
import type { SubsidioTimelineEvento } from '../../../models/subsidio.models';

@Component({
  selector: 'app-subsidio-tab-timeline',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tab-panel">
      @if (loading()) {
        <div class="tab-panel__loading"><mat-spinner diameter="32" /></div>
      } @else if (eventos().length === 0) {
        <div class="tab-panel__empty">
          <mat-icon fontIcon="timeline" aria-hidden="true" />
          <p>Aún no hay eventos en la línea de tiempo.</p>
        </div>
      } @else {
        <ol class="timeline" [attr.aria-label]="titulo()">
          @for (ev of eventos(); track ev.id) {
            <li class="timeline__item">
              <div class="timeline__dot" aria-hidden="true"></div>
              <div class="timeline__body">
                <time class="timeline__fecha">{{ ev.createdAt | date: 'dd/MM/yyyy HH:mm' }}</time>
                <strong class="timeline__tipo">{{ ev.tipoEvento }}</strong>
                <p class="timeline__desc">{{ ev.descripcion }}</p>
                @if (ev.usuario) {
                  <small class="timeline__user">{{ ev.usuario }}</small>
                }
              </div>
            </li>
          }
        </ol>
      }
    </div>
  `,
  styles: `
    .timeline { list-style: none; margin: 0; padding: 0; }
    .timeline__item { display: flex; gap: 12px; padding-bottom: 16px; position: relative; }
    .timeline__item:not(:last-child)::before {
      content: ''; position: absolute; left: 5px; top: 14px; bottom: 0; width: 2px; background: #e7ecf2;
    }
    .timeline__dot { width: 12px; height: 12px; border-radius: 50%; background: #1f3a5f; margin-top: 4px; flex-shrink: 0; }
    .timeline__fecha { font-size: 12px; color: #64748b; }
    .timeline__tipo { display: block; font-size: 14px; }
    .timeline__desc { margin: 4px 0 0; font-size: 13px; }
    .timeline__user { color: #64748b; }
  `,
})
export class TabLineaTiempoComponent {
  readonly casoId = input.required<number>();
  readonly titulo = input('Línea de tiempo del caso');

  private readonly api = inject(SubsidioApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly eventos = signal<readonly SubsidioTimelineEvento[]>([]);

  constructor() {
    effect(() => this.cargar(this.casoId()));
  }

  private cargar(casoId: number): void {
    this.loading.set(true);
    this.api
      .timeline(casoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.eventos.set(rows);
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
