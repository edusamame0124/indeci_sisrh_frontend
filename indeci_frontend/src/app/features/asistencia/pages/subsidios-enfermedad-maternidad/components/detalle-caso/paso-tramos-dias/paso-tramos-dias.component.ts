import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../../core/models/error-response.model';
import { SubsidioApiService } from '../../../services/subsidio-api.service';
import type { SubsidioCasoResponse, SubsidioValidacion } from '../../../models/subsidio.models';
import {
  formatFechaSubsidio,
  labelEstadoTramo,
  tienePermisoSubsidio,
} from '../../../utils/subsidio-calculo-display.utils';

@Component({
  selector: 'app-subsidio-paso-tramos-dias',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paso-tramos-dias.component.html',
  styleUrl: './paso-tramos-dias.component.css',
})
export class PasoTramosDiasComponent {
  readonly caso = input.required<SubsidioCasoResponse>();
  readonly validaciones = input<readonly SubsidioValidacion[]>([]);
  readonly casoActualizado = output<SubsidioCasoResponse>();

  private readonly api = inject(SubsidioApiService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly generando = signal(false);
  readonly columnas = ['periodo', 'fechas', 'subsidio', 'laborados', 'estado'] as const;
  readonly labelEstado = labelEstadoTramo;
  readonly formatFecha = formatFechaSubsidio;

  readonly puedeEscribir = () => tienePermisoSubsidio(this.auth.permisos(), 'SUB_WRITE');

  totalDiasSubsidio(): number {
    return this.caso().tramos.reduce((acc, t) => acc + t.diasSubsidio, 0);
  }

  totalDiasLaborados(): number {
    return this.caso().tramos.reduce((acc, t) => acc + t.diasLaborados, 0);
  }

  alertasTramo(): readonly string[] {
    return this.validaciones()
      .filter((v) => v.tramoId != null && (v.severidad === 'BLOQUEO' || v.severidad === 'ALERTA'))
      .slice(0, 3)
      .map((v) => v.mensaje);
  }

  generarTramos(): void {
    this.generando.set(true);
    this.api
      .generarTramos(this.caso().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.generando.set(false);
          this.snack.open('Tramos mensuales generados', 'Cerrar', { duration: 4000 });
          this.api.obtenerCaso(this.caso().id).subscribe({
            next: (c) => this.casoActualizado.emit(c),
          });
        },
        error: (err: HttpErrorResponse) => {
          this.generando.set(false);
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
