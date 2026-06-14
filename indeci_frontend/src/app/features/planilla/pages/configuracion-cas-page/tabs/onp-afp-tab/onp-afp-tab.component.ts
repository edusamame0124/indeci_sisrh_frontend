import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { ParametroPrevisionalApiService } from '../../../../services/parametro-previsional-api.service';
import type { PrevisionalKpi } from '../../../../models/parametro-previsional.model';
import { AfpTabComponent } from './components/afp-tab/afp-tab.component';
import { OnpTabComponent } from './components/onp-tab/onp-tab.component';
import { HistorialPrevisionalComponent } from './components/historial-previsional/historial-previsional.component';
import { AuditoriaPrevisionalComponent } from './components/auditoria-previsional/auditoria-previsional.component';
import { ResolverParametroComponent } from './components/resolver-parametro/resolver-parametro.component';

/**
 * Configuración previsional ONP/AFP.
 * Shell principal con KPIs, sub-tabs, panel informativo lateral y resolver.
 * Spec: INDECI_AFP_PARAMETRO_VIGENCIA / INDECI_ONP_PARAMETRO_VIGENCIA.
 */
@Component({
  selector: 'app-onp-afp-tab',
  standalone: true,
  imports: [
    MatTabsModule,
    MatIconModule,
    AfpTabComponent,
    OnpTabComponent,
    HistorialPrevisionalComponent,
    AuditoriaPrevisionalComponent,
    ResolverParametroComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onp-afp-tab.component.html',
  styleUrl: './onp-afp-tab.component.css',
})
export class OnpAfpTabComponent implements OnInit {
  private readonly api = inject(ParametroPrevisionalApiService);

  readonly tabActivo = signal(0);
  readonly kpi = signal<PrevisionalKpi | null>(null);
  readonly kpiLoading = signal(true);

  ngOnInit(): void {
    this.cargarKpi();
  }

  onTabChange(i: number): void {
    this.tabActivo.set(i);
  }

  private cargarKpi(): void {
    this.kpiLoading.set(true);
    this.api.kpi().subscribe({
      next: (k) => { this.kpi.set(k); this.kpiLoading.set(false); },
      error: () => {
        this.kpi.set({ afpVigentes: 4, onpVigente: 1, proximaVigencia: 2, ultimaActualizacionSbs: '01/05/2024' });
        this.kpiLoading.set(false);
      },
    });
  }
}
