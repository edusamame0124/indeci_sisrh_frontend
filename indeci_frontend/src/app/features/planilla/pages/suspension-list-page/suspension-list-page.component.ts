import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/**
 * B3 / M09 — Suspensiones / Licencias (placeholder de scaffolding).
 *
 * UI definitiva pendiente: fase visual de B3-7 (skills sisrh-design-system +
 * ui-design-brain + impeccable). El `SuspensionApiService` ya está cableado para
 * los endpoints `/api/rrhh/suspension` (B3-6). Fuente de datos del archivo .snl.
 */
@Component({
  selector: 'app-suspension-list-page',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './suspension-list-page.component.html',
  styleUrl: './suspension-list-page.component.css',
})
export class SuspensionListPageComponent {}
