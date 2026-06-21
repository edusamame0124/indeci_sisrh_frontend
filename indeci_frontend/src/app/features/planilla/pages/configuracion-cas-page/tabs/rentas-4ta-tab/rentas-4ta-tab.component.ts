import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Rentas4taCasTabComponent } from './components/rentas-4ta-cas-tab/rentas-4ta-cas-tab.component';
import { ResolverIr4taComponent } from './components/resolver-ir4ta/resolver-ir4ta.component';
import { HistorialIr4taComponent } from './components/historial-ir4ta/historial-ir4ta.component';
import { AuditoriaIr4taComponent } from './components/auditoria-ir4ta/auditoria-ir4ta.component';

@Component({
  selector: 'app-rentas-4ta-tab',
  standalone: true,
  imports: [
    MatTabsModule,
    MatIconModule,
    Rentas4taCasTabComponent,
    ResolverIr4taComponent,
    HistorialIr4taComponent,
    AuditoriaIr4taComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rentas-4ta-tab.component.html',
  styleUrl: './rentas-4ta-tab.component.css',
})
export class Rentas4taTabComponent {}
