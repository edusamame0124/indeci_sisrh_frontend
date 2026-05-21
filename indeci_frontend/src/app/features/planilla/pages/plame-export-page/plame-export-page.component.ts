import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/**
 * B3 / M09 — Exportación PLAME / PDT 601 (placeholder de scaffolding).
 *
 * UI definitiva pendiente: se implementa en la fase visual de B3-7 con los skills
 * sisrh-design-system + ui-design-brain + impeccable. El `PlameApiService` ya está
 * cableado y listo para consumir los endpoints `/api/rrhh/plame` (B3-6).
 */
@Component({
  selector: 'app-plame-export-page',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plame-export-page.component.html',
  styleUrl: './plame-export-page.component.css',
})
export class PlameExportPageComponent {}
