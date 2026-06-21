import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { EmpleadoSaludEpsRow } from '../../../../models/empleado-salud-eps.model';

@Component({
  selector: 'app-salud-eps-documentos-tab',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salud-eps-documentos-tab.component.html',
  styleUrl: './salud-eps-documentos-tab.component.css',
})
export class SaludEpsDocumentosTabComponent {
  @Input() rows: readonly EmpleadoSaludEpsRow[] = [];

  get conDocumento(): readonly EmpleadoSaludEpsRow[] {
    return this.rows.filter((r) => r.documentoSustento || r.observacion);
  }
}
