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
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../../core/models/error-response.model';
import { SubsidioApiService } from '../../../services/subsidio-api.service';
import type { SubsidioBaseHistoricaResponse, SubsidioCasoResponse } from '../../../models/subsidio.models';
import { formatSubsidioMonto, tienePermisoSubsidio } from '../../../utils/subsidio-calculo-display.utils';

@Component({
  selector: 'app-subsidio-tab-base',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tab-base-historica.component.html',
  styleUrl: './tab-base-historica.component.css',
})
export class TabBaseHistoricaComponent {
  readonly casoId = input.required<number>();
  readonly modo = input<'resumen' | 'detalle'>('resumen');
  readonly casoActualizado = output<SubsidioCasoResponse>();
  readonly baseCargada = output<SubsidioBaseHistoricaResponse | null>();

  private readonly api = inject(SubsidioApiService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly calculando = signal(false);
  readonly base = signal<SubsidioBaseHistoricaResponse | null>(null);
  readonly columnas = ['periodo', 'rem', 'tope', 'base'] as const;
  readonly formatMonto = formatSubsidioMonto;

  readonly puedeCalcular = () => tienePermisoSubsidio(this.auth.permisos(), 'SUB_CALCULATE');

  constructor() {
    effect(() => this.cargarBase(this.casoId()));
  }

  cargar(): void {
    this.cargarBase(this.casoId());
  }

  calcular(): void {
    this.calculando.set(true);
    this.api
      .calcularBase(this.casoId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.calculando.set(false);
          this.base.set(res);
          this.baseCargada.emit(res);
          this.snack.open('Base histórica calculada', 'Cerrar', { duration: 4000 });
          this.api.obtenerCaso(this.casoId()).subscribe({
            next: (c) => this.casoActualizado.emit(c),
          });
        },
        error: (err: HttpErrorResponse) => {
          this.calculando.set(false);
          this.onError(err);
        },
      });
  }

  private cargarBase(casoId: number): void {
    this.loading.set(true);
    this.api
      .obtenerBase(casoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.base.set(res);
          this.baseCargada.emit(res);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 404) {
            this.base.set(null);
            this.baseCargada.emit(null);
            return;
          }
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
}
