import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { NotificacionService } from '../../../../core/services/notificacion.service';
import { CtsApiService } from '../../services/cts-api.service';
import type { CtsCandidato, CtsDesglose } from '../../models/cts.model';
import { CtsSnapshotDrawerComponent } from '../../components/cts-snapshot-drawer/cts-snapshot-drawer.component';

const REGIMENES_CAS = new Set(['1057', 'CAS']);

/**
 * Feature 016 / US1 — Liquidación de CTS Trunca (pantalla dedicada).
 *
 * Poka-Yoke de entrada: con régimen CAS 1057 bloquea la grilla. Buscador/grilla
 * solo muestran cesantes; el analista NUNCA digita montos (flujo unidireccional).
 */
@Component({
  selector: 'app-cts-liquidacion-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CtsSnapshotDrawerComponent,
  ],
  templateUrl: './cts-liquidacion-page.component.html',
  styleUrl: './cts-liquidacion-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtsLiquidacionPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CtsApiService);
  private readonly notif = inject(NotificacionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly qp = this.route.snapshot.queryParamMap;
  readonly periodo = signal<string>(this.qp.get('periodo') ?? '');
  readonly regimenLaboralId = signal<number | null>(
    this.qp.get('regimenLaboralId') ? Number(this.qp.get('regimenLaboralId')) : null,
  );
  readonly regimenCodigo = signal<string>((this.qp.get('regimen') ?? '').toUpperCase());

  readonly candidatos = signal<readonly CtsCandidato[]>([]);
  readonly desglose = signal<CtsDesglose | null>(null);
  readonly cargando = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly bloqueadoPorCas = computed(() => REGIMENES_CAS.has(this.regimenCodigo()));

  readonly notaNormativa = computed(() =>
    this.regimenCodigo() === 'SERVIR' || this.regimenCodigo() === '30057'
      ? 'Ley N.° 30057 Art. 34 + D.S. 040-2014-PCM — 100% de la Valorización Principal por año de servicios y fracción. Excluye valorización ajustada/priorizada, aguinaldos y extraordinarios. No aplican depósitos semestrales.'
      : 'D.Leg. 276 — Compensación por Tiempo de Servicios sobre la remuneración principal (MUC) al cese; excluye aguinaldos y fracciones extraordinarias.',
  );

  constructor() {
    if (!this.bloqueadoPorCas() && this.regimenLaboralId() != null && this.periodo()) {
      this.cargarCandidatos();
    }
  }

  cargarCandidatos(): void {
    const regId = this.regimenLaboralId();
    if (regId == null) return;
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .listarCandidatos(this.periodo(), regId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.candidatos.set(rows);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los cesantes. Reintente.');
          this.cargando.set(false);
        },
      });
  }

  calcular(row: CtsCandidato): void {
    if (!row.aptoParaCalcular) return;
    this.cargando.set(true);
    this.api
      .calcular({
        empleadoId: row.empleadoId,
        empleadoPlanillaId: row.empleadoPlanillaId,
        periodo: this.periodo(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (liq) => {
          this.notif.exito('Liquidación de CTS calculada');
          this.cargando.set(false);
          this.verDesglose(liq.id);
          this.cargarCandidatos();
        },
        error: (e) => {
          this.error.set(e?.error?.mensaje ?? 'No se pudo calcular la liquidación.');
          this.cargando.set(false);
        },
      });
  }

  verDesglose(id: number): void {
    this.api
      .desglose(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => this.desglose.set(d),
        error: () => this.error.set('No se pudo obtener el desglose.'),
      });
  }

  aprobar(id: number): void {
    this.api
      .aprobar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notif.exito('Liquidación aprobada y cerrada');
          this.verDesglose(id);
          this.cargarCandidatos();
        },
        error: (e) => this.error.set(e?.error?.mensaje ?? 'No se pudo aprobar la liquidación.'),
      });
  }

  cerrarDrawer(): void {
    this.desglose.set(null);
  }
}
