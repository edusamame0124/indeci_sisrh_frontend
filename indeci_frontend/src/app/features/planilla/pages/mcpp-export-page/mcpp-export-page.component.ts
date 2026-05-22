import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/**
 * B3 / M14 — Exportación MCPP Web (placeholder de scaffolding).
 *
 * UI definitiva pendiente: fase visual de B3-7 (skills sisrh-design-system +
 * ui-design-brain + impeccable). El `McppApiService` ya está cableado para los
 * endpoints `/api/rrhh/mcpp` (B3-6).
 */
@Component({
  selector: 'app-mcpp-export-page',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mcpp-export-page.component.html',
  styleUrl: './mcpp-export-page.component.css',
})
export class McppExportPageComponent {}
