import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { ConsultaDiariaAsistenciaPageComponent } from '../consulta-diaria-asistencia-page/consulta-diaria-asistencia-page.component';
import { CargaAsistenciaPageComponent } from '../carga-asistencia-page/carga-asistencia-page.component';
import { JornadaRegimenConfigPageComponent } from '../jornada-regimen-config-page/jornada-regimen-config-page.component';
import { CargaMasivaCsvPageComponent } from '../carga-masiva-csv-page/carga-masiva-csv-page.component';
import { HistorialImportacionesPageComponent } from '../historial-importaciones-page/historial-importaciones-page.component';
import { AsistenciaTabService } from '../../services/asistencia-tab.service';

@Component({
  selector: 'app-carga-asistencia-shell',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatTabsModule,
    ConsultaDiariaAsistenciaPageComponent,
    CargaAsistenciaPageComponent,
    JornadaRegimenConfigPageComponent,
    CargaMasivaCsvPageComponent,
    HistorialImportacionesPageComponent,
  ],
  templateUrl: './carga-asistencia-shell.component.html',
  styleUrl: './carga-asistencia-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargaAsistenciaShellComponent {
  readonly tabs = inject(AsistenciaTabService);
}
