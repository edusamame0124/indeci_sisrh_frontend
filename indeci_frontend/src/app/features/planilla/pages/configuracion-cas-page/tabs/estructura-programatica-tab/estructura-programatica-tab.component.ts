import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MetaDashboardTabComponent } from './tabs/meta-dashboard-tab/meta-dashboard-tab.component';
import { TrazabilidadTabComponent } from '../../../metas-presupuestales-page/tabs/trazabilidad-tab/trazabilidad-tab.component';
import { CatalogoMetaTabComponent } from '../../../metas-presupuestales-page/tabs/catalogo-meta-tab/catalogo-meta-tab.component';
import { AsignacionMetaTabComponent } from '../../../metas-presupuestales-page/tabs/asignacion-meta-tab/asignacion-meta-tab.component';
import { EquivalenciasMetaTabComponent } from '../../../metas-presupuestales-page/tabs/equivalencias-meta-tab/equivalencias-meta-tab.component';
import { WizardActualizacionComponent } from '../../../metas-presupuestales-page/tabs/wizard-actualizacion/wizard-actualizacion.component';

const ANIO_ACTUAL = new Date().getFullYear();

@Component({
  selector: 'app-estructura-programatica-tab',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTabsModule,
    MetaDashboardTabComponent,
    TrazabilidadTabComponent,
    CatalogoMetaTabComponent,
    AsignacionMetaTabComponent,
    EquivalenciasMetaTabComponent,
    WizardActualizacionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estructura-programatica-tab.component.html',
  styleUrl: './estructura-programatica-tab.component.css',
})
export class EstructuraProgramaticaTabComponent {
  readonly anioFiscal    = signal(ANIO_ACTUAL + 1);
  readonly subTabActivo  = signal(0);

  readonly aniosDisponibles = [ANIO_ACTUAL + 1, ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2];

  navegarATab(index: number): void {
    this.subTabActivo.set(index);
  }
}
