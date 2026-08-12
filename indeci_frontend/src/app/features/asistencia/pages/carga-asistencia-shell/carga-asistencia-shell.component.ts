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
import { Turno24hPageComponent } from '../turno-24h-page/turno-24h-page.component';
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
    Turno24hPageComponent,
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
   * Backfills ÚNICOS (temporales) de mantenimiento de asistencia. Ocultos de la UI a pedido
   * (2026-08-12) — los endpoints y la lógica de cada uno siguen intactos en el backend, solo se
   * dejó de mostrar la tarjeta. Para reactivar la visibilidad, volver a
   * `this.auth.roles().includes('SUPER_ADMIN')`.
   */
  readonly puedeVerBackfill = () => false;

  /**
   * Excepción puntual (2026-08-12): el backfill de "Omisión de marca como Falta" (RIS INDECI
   * Art. 25.5) sí se vuelve a mostrar, solo para SUPER_ADMIN, porque hace falta correrlo para
   * poner al día las cabeceras que ya estaban cargadas antes del fix. Los otros 5 backfills
   * siguen ocultos (`puedeVerBackfill`).
   */
  readonly puedeVerBackfillOmisionComoFalta = () => this.auth.roles().includes('SUPER_ADMIN');

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

  /**
   * Backfill ÚNICO (temporal, independiente de los anteriores) — corrige cabeceras activas
   * que quedaron con cobertura incompleta por re-importaciones anteriores al fix de fusión
   * de días en guardarImportacion (días huérfanos en versiones inactivas). Mismo criterio de
   * visibilidad: solo SUPER_ADMIN.
   */
  readonly backfillHuerfanosEjecutando = signal(false);
  readonly backfillHuerfanosResultado = signal<number | null>(null);
  readonly backfillHuerfanosError = signal<string | null>(null);

  ejecutarBackfillDiasHuerfanos(): void {
    this.backfillHuerfanosEjecutando.set(true);
    this.backfillHuerfanosResultado.set(null);
    this.backfillHuerfanosError.set(null);

    this.asistenciaApi.backfillDiasHuerfanos().subscribe({
      next: (corregidas) => {
        this.backfillHuerfanosEjecutando.set(false);
        this.backfillHuerfanosResultado.set(corregidas);
      },
      error: (err) => {
        this.backfillHuerfanosEjecutando.set(false);
        this.backfillHuerfanosError.set(
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo ejecutar el backfill.',
        );
      },
    });
  }

  /**
   * Backfill ÚNICO (temporal, independiente de los anteriores) — corrige días ya persistidos
   * mal clasificados como LABORAL ("Presente") porque el parser del marcador nunca llenaba el
   * dato de salida anticipada (bug corregido 2026-08-07). Mismo criterio de visibilidad: solo
   * SUPER_ADMIN.
   */
  readonly backfillSalidaAnticipadaEjecutando = signal(false);
  readonly backfillSalidaAnticipadaResultado = signal<number | null>(null);
  readonly backfillSalidaAnticipadaError = signal<string | null>(null);

  ejecutarBackfillSalidaAnticipada(): void {
    this.backfillSalidaAnticipadaEjecutando.set(true);
    this.backfillSalidaAnticipadaResultado.set(null);
    this.backfillSalidaAnticipadaError.set(null);

    this.asistenciaApi.backfillSalidaAnticipada().subscribe({
      next: (corregidos) => {
        this.backfillSalidaAnticipadaEjecutando.set(false);
        this.backfillSalidaAnticipadaResultado.set(corregidos);
      },
      error: (err) => {
        this.backfillSalidaAnticipadaEjecutando.set(false);
        this.backfillSalidaAnticipadaError.set(
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo ejecutar el backfill.',
        );
      },
    });
  }

  /**
   * Backfill ÚNICO (temporal, independiente de los anteriores) — corrige días ya persistidos
   * como FALTA de guardias COEN 24h para empleados con turno 24h activo, usando el mismo
   * reconciliador que corre en cada import nuevo. Mismo criterio de visibilidad: solo
   * SUPER_ADMIN.
   */
  readonly backfillTurno24hEjecutando = signal(false);
  readonly backfillTurno24hResultado = signal<number | null>(null);
  readonly backfillTurno24hError = signal<string | null>(null);

  ejecutarBackfillTurno24h(): void {
    this.backfillTurno24hEjecutando.set(true);
    this.backfillTurno24hResultado.set(null);
    this.backfillTurno24hError.set(null);

    this.asistenciaApi.backfillTurno24h().subscribe({
      next: (corregidos) => {
        this.backfillTurno24hEjecutando.set(false);
        this.backfillTurno24hResultado.set(corregidos);
      },
      error: (err) => {
        this.backfillTurno24hEjecutando.set(false);
        this.backfillTurno24hError.set(
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo ejecutar el backfill.',
        );
      },
    });
  }

  /**
   * Backfill ÚNICO (temporal, independiente de los anteriores) — RIS INDECI Art. 25.5:
   * recalcula DIAS_FALTA/DESCUENTO_FALTA de las cabeceras activas con algún día en Omisión de
   * marca, cargadas antes de que ese cómputo empezara a correr solo en cada import/edición.
   * Mismo criterio de visibilidad: solo SUPER_ADMIN.
   */
  readonly backfillOmisionComoFaltaEjecutando = signal(false);
  readonly backfillOmisionComoFaltaResultado = signal<number | null>(null);
  readonly backfillOmisionComoFaltaError = signal<string | null>(null);

  ejecutarBackfillOmisionComoFalta(): void {
    this.backfillOmisionComoFaltaEjecutando.set(true);
    this.backfillOmisionComoFaltaResultado.set(null);
    this.backfillOmisionComoFaltaError.set(null);

    this.asistenciaApi.backfillOmisionComoFalta().subscribe({
      next: (corregidas) => {
        this.backfillOmisionComoFaltaEjecutando.set(false);
        this.backfillOmisionComoFaltaResultado.set(corregidas);
      },
      error: (err) => {
        this.backfillOmisionComoFaltaEjecutando.set(false);
        this.backfillOmisionComoFaltaError.set(
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo ejecutar el backfill.',
        );
      },
    });
  }
}
