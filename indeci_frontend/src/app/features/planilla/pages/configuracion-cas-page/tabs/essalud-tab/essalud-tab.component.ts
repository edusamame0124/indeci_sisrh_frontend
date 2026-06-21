import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { EssaludCasTabComponent } from './components/essalud-cas-tab/essalud-cas-tab.component';
import { ResolverEssaludComponent } from './components/resolver-essalud/resolver-essalud.component';
import { HistorialEssaludComponent } from './components/historial-essalud/historial-essalud.component';
import { AuditoriaEssaludComponent } from './components/auditoria-essalud/auditoria-essalud.component';

@Component({
  selector: 'app-essalud-tab',
  standalone: true,
  imports: [
    MatTabsModule,
    MatIconModule,
    EssaludCasTabComponent,
    ResolverEssaludComponent,
    HistorialEssaludComponent,
    AuditoriaEssaludComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './essalud-tab.component.html',
  styleUrl: './essalud-tab.component.css',
})
export class EssaludTabComponent {}
