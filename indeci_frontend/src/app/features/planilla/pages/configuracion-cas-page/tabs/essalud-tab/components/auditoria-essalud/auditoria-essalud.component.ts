import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-auditoria-essalud',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auditoria-essalud.component.html',
  styleUrl: './auditoria-essalud.component.css',
})
export class AuditoriaEssaludComponent {}
