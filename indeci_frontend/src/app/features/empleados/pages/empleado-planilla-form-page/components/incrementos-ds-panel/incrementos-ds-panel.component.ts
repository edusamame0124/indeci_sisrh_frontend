import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { IncrementosDsResponse } from '../../../../models/incrementos-ds.model';

@Component({
  selector: 'app-incrementos-ds-panel',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './incrementos-ds-panel.component.html',
  styleUrl: './incrementos-ds-panel.component.scss',
})
export class IncrementosDsPanelComponent {
  readonly incrementos = input<IncrementosDsResponse | null>(null);
  readonly loading = input(false);
  readonly montoContratado = input<number | null>(null);

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
