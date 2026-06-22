import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-resumen-remuneracion-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resumen-remuneracion-card.component.html',
  styleUrl: './resumen-remuneracion-card.component.scss',
})
export class ResumenRemuneracionCardComponent {
  readonly montoContratado = input<number | null>(null);
  readonly totalIncrementos = input(0);
  readonly remuneracionMensual = input<number | null>(null);
  readonly muestraAsigFamiliar = input(false);
  /** Monto informativo proyectado (10% RMV); no suma al hero. */
  readonly asigFamiliarProyectada = input(102.5);

  private readonly moneyFmt = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  });

  fmtMoney(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    return this.moneyFmt.format(value);
  }
}
