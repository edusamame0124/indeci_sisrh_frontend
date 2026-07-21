import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Estado visual del indicador circular de progreso. */
export type EstadoProgresoCircular = 'PROCESANDO' | 'COMPLETADO' | 'ERROR';

/**
 * Indicador CIRCULAR de progreso en porcentaje (Opción B — "Ejecutar cálculo").
 *
 * <p>Usa {@code mat-progress-spinner} en modo determinate (arco que se llena) con el porcentaje al
 * centro. Presentacional puro (solo inputs): la lógica de polling vive en la pantalla que lo usa.
 * Colores por estado vía la variable MDC {@code --mdc-circular-progress-active-indicator-color}.
 */
@Component({
  selector: 'app-calculo-progreso-circular',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="cpc"
      [class.cpc--ok]="estado() === 'COMPLETADO'"
      [class.cpc--error]="estado() === 'ERROR'"
      role="status"
      aria-live="polite"
      [attr.aria-label]="'Progreso ' + porcentaje() + ' por ciento'"
    >
      <div class="cpc__ring" [style.width.px]="diametro()" [style.height.px]="diametro()">
        <mat-progress-spinner mode="determinate" [value]="porcentaje()" [diameter]="diametro()" [strokeWidth]="6" />
        <span class="cpc__pct">
          @if (estado() === 'ERROR') {
            <mat-icon fontIcon="error" aria-hidden="true" />
          } @else if (estado() === 'COMPLETADO') {
            <mat-icon fontIcon="check" aria-hidden="true" />
          } @else {
            {{ porcentaje() }}%
          }
        </span>
      </div>

      @if (mostrarFase()) {
        <span class="cpc__fase">
          @if (estado() === 'COMPLETADO') {
            ✓ Cálculo completado
          } @else if (estado() === 'ERROR') {
            {{ error() || 'Error en el cálculo' }}
          } @else {
            {{ fase() }}
          }
        </span>
      }
    </div>
  `,
  styles: [
    `
      .cpc {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      .cpc__ring {
        position: relative;
        display: inline-flex;
        flex: 0 0 auto;
      }
      .cpc__pct {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
        color: var(--text-primary, #0a1e35);
      }
      .cpc__pct mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .cpc__fase {
        font-size: 13px;
        color: var(--text-secondary, #64748b);
      }
      /* Completado → verde */
      .cpc--ok {
        --mdc-circular-progress-active-indicator-color: var(--status-success, #157347);
      }
      .cpc--ok .cpc__pct {
        color: var(--status-success, #157347);
      }
      .cpc--ok .cpc__fase {
        color: var(--status-success, #157347);
      }
      /* Error → rojo */
      .cpc--error {
        --mdc-circular-progress-active-indicator-color: var(--status-danger, #a32d2d);
      }
      .cpc--error .cpc__pct,
      .cpc--error .cpc__fase {
        color: var(--status-danger, #a32d2d);
      }
    `,
  ],
})
export class CalculoProgresoCircularComponent {
  readonly porcentaje = input(0);
  readonly fase = input('');
  readonly estado = input<EstadoProgresoCircular>('PROCESANDO');
  readonly error = input<string | null>(null);
  /** Diámetro del anillo (px). */
  readonly diametro = input(64);
  /** Muestra el texto de fase/estado al lado del anillo. */
  readonly mostrarFase = input(true);
}
