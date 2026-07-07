import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import type { CtsDesglose } from '../../models/cts.model';

/**
 * Feature 016 — Panel lateral "Desglose y Trazabilidad del Cálculo".
 *
 * Componente hijo aislado (OnPush) alimentado por un signal input: al cambiar de
 * fila la data se reemplaza y el DOM se limpia de inmediato. Solo lectura: NO
 * digita montos (flujo unidireccional).
 */
@Component({
  selector: 'sisrh-cts-snapshot-drawer',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './cts-snapshot-drawer.component.html',
  styleUrl: './cts-snapshot-drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtsSnapshotDrawerComponent {
  readonly data = input<CtsDesglose | null>(null);
  readonly cerrar = output<void>();
  readonly aprobar = output<number>();
}
