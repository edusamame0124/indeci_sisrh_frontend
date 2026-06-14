import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { EssaludTabComponent } from './tabs/essalud-tab/essalud-tab.component';
import { EstructuraProgramaticaTabComponent } from './tabs/estructura-programatica-tab/estructura-programatica-tab.component';
import { OnpAfpTabComponent } from './tabs/onp-afp-tab/onp-afp-tab.component';
import { Rentas4taTabComponent } from './tabs/rentas-4ta-tab/rentas-4ta-tab.component';

/**
 * Configuración Anual CAS — shell con pestañas.
 * Agrupa parámetros anuales del régimen CAS: ONP/AFP, ESSALUD,
 * Rentas de 4ta categoría y Estructura Programática.
 */
@Component({
  selector: 'app-configuracion-cas-page',
  standalone: true,
  imports: [
    MatTabsModule,
    MatIconModule,
    OnpAfpTabComponent,
    EssaludTabComponent,
    Rentas4taTabComponent,
    EstructuraProgramaticaTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion-cas-page.component.html',
  styleUrl: './configuracion-cas-page.component.css',
})
export class ConfiguracionCasPageComponent {
  readonly tabActivo = signal(0);

  onTabChange(index: number): void {
    this.tabActivo.set(index);
  }
}
