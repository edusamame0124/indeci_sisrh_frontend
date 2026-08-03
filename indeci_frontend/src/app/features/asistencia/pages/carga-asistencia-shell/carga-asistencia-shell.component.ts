import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ConsultaDiariaAsistenciaPageComponent } from '../consulta-diaria-asistencia-page/consulta-diaria-asistencia-page.component';
import { CargaAsistenciaPageComponent } from '../carga-asistencia-page/carga-asistencia-page.component';
import { JornadaRegimenConfigPageComponent } from '../jornada-regimen-config-page/jornada-regimen-config-page.component';
import { CargaMasivaCsvPageComponent } from '../carga-masiva-csv-page/carga-masiva-csv-page.component';
import { HistorialImportacionesPageComponent } from '../historial-importaciones-page/historial-importaciones-page.component';
import { AsistenciaTabService } from '../../services/asistencia-tab.service';
import { AsistenciaApiService } from '../../services/asistencia-api.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-carga-asistencia-shell',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
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

  private readonly asistenciaApi = inject(AsistenciaApiService);
  private readonly auth = inject(AuthService);

  /**
   * Backfill ÚNICO (temporal) — reconcilia papeletas ya APROBADAS contra la asistencia:
   * Vacaciones/Licencia (justifican el día) y papeletas tipo permiso (p.ej. Comisión de
   * Servicio) que autorizan automáticamente la tardanza que cubren. Visible solo para
   * SUPER_ADMIN (mismo permiso que exige el endpoint). Quitar este bloque + el método del
   * servicio una vez ejecutado en cada ambiente — no es una función permanente del módulo.
   */
  readonly puedeVerBackfill = () => this.auth.roles().includes('SUPER_ADMIN');

  readonly backfillEjecutando = signal(false);
  readonly backfillResultado = signal<number | null>(null);
  readonly backfillError = signal<string | null>(null);

  ejecutarBackfillAsistencia(): void {
    this.backfillEjecutando.set(true);
    this.backfillResultado.set(null);
    this.backfillError.set(null);

    this.asistenciaApi.backfillReconciliacionVacaciones().subscribe({
      next: (procesadas) => {
        this.backfillEjecutando.set(false);
        this.backfillResultado.set(procesadas);
      },
      error: (err) => {
        this.backfillEjecutando.set(false);
        this.backfillError.set(
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo ejecutar el backfill.',
        );
      },
    });
  }

  /**
   * Backfill ÚNICO (temporal, independiente del anterior) — corrige días ya persistidos mal
   * clasificados como LABORAL/OBSERVADO que en realidad son FERIADO. Mismo criterio de
   * visibilidad: solo SUPER_ADMIN.
   */
  readonly backfillFeriadosEjecutando = signal(false);
  readonly backfillFeriadosResultado = signal<number | null>(null);
  readonly backfillFeriadosError = signal<string | null>(null);

  ejecutarBackfillFeriados(): void {
    this.backfillFeriadosEjecutando.set(true);
    this.backfillFeriadosResultado.set(null);
    this.backfillFeriadosError.set(null);

    this.asistenciaApi.backfillFeriados().subscribe({
      next: (corregidos) => {
        this.backfillFeriadosEjecutando.set(false);
        this.backfillFeriadosResultado.set(corregidos);
      },
      error: (err) => {
        this.backfillFeriadosEjecutando.set(false);
        this.backfillFeriadosError.set(
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo ejecutar el backfill.',
        );
      },
    });
  }
}
