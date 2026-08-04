import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PadronVacacionalRowDto, RecordVacacionalDetalle } from '../../models/padron-vacacional.model';
import { PadronVacacionalApiService } from '../../services/padron-vacacional-api.service';

@Component({
  selector: 'app-vacacion-detalle-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Detalle de récord vacacional</h2>
    <mat-dialog-content>
      <div class="empleado-info">
        <strong>{{ data.nombreCompleto }}</strong> ({{ data.dni }})<br />
        <small>{{ data.cargo }} - {{ data.dependencia }} · {{ data.regimenLaboral }}</small>
      </div>

      <div *ngIf="data.sinVinculo" class="sin-vinculo">
        El empleado no tiene un vínculo activo con fechas válidas para computar el récord.
      </div>

      <ng-container *ngIf="!data.sinVinculo">
        <!-- V012_55 — Trazabilidad del último "Registro Directo de Goce (Override)", si existe. -->
        <div class="traza" *ngIf="detalle()?.ultimoOverride as ov">
          <div class="traza-head">
            <mat-icon>verified_user</mat-icon>
            Trazabilidad del registro
            <span class="badge badge--override">Override</span>
          </div>
          <dl class="traza-grid">
            <dt>Registrado por</dt>
            <dd>{{ ov.usuarioRegistro || 'Sin dato (registro previo a V012_55)' }}</dd>
            <dt>Fecha y hora</dt>
            <dd class="mono">{{ ov.fechaRegistro ? (ov.fechaRegistro | date: 'dd/MM/yyyy · HH:mm') : '—' }}</dd>
            <dt>Período</dt>
            <dd class="mono">{{ fecha(ov.periodoDesde) }} – {{ fecha(ov.periodoHasta) }} ({{ ov.dias }} d)</dd>
            <dt>Documento sustento</dt>
            <dd class="mono">{{ ov.documentoSustento || '—' }}</dd>
            <dt>Motivo / bypass</dt>
            <dd>{{ ov.motivoExcepcion || '—' }}</dd>
            <dt>Adelanto vacacional</dt>
            <dd>
              <span class="badge" [class.badge--success]="ov.esAdelanto === 1" [class.badge--secondary]="ov.esAdelanto !== 1">
                {{ ov.esAdelanto === 1 ? 'Sí — ignoró límite de saldo' : 'No' }}
              </span>
            </dd>
          </dl>
          <p class="traza-hint">Si el empleado tiene más de un registro por Override, este es el más reciente — ver "Historial" para el listado completo.</p>
        </div>

        <!-- Resumen (fuente de verdad: BD del padrón) -->
        <table class="desglose">
          <tbody>
            <tr>
              <td>Días que corresponden</td>
              <td class="val">{{ data.diasCorresponden }} d</td>
            </tr>
            <tr>
              <td>Gozados / Saldo</td>
              <td class="val">{{ data.diasGozados }} d / {{ data.saldo }} d</td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="cargando()" class="cargando">
          <mat-spinner diameter="28"></mat-spinner>
          <span>Cargando desglose…</span>
        </div>

        <ng-container *ngIf="detalle() as det">
          <!-- NIVEL 1 — acumulado de la carrera (reconcilia con Configuración Remunerativa) -->
          <h3 class="seccion">Acumulado de la carrera</h3>
          <p class="seccion-hint">Antigüedad total y descuentos de toda la carrera (coincide con Configuración Remunerativa / Vinculación).</p>
          <table class="desglose">
            <tbody>
              <tr>
                <td>Antigüedad total (vínculo)</td>
                <td class="val">{{ amdTs(det.acumulado.tiempoServicio) }}</td>
              </tr>
              <tr class="resta">
                <td>(−) Licencia sin goce (total)</td>
                <td class="val">{{ det.acumulado.diasNoComputables.lsg }} d</td>
              </tr>
              <tr class="resta">
                <td>(−) Faltas injustificadas (total)</td>
                <td class="val">{{ det.acumulado.diasNoComputables.faltas }} d</td>
              </tr>
              <tr class="resta" *ngIf="det.acumulado.diasNoComputables.suspensiones > 0">
                <td>(−) Suspensiones (total)</td>
                <td class="val">{{ det.acumulado.diasNoComputables.suspensiones }} d</td>
              </tr>
              <tr class="total">
                <td>= Tiempo efectivo total</td>
                <td class="val">
                  {{ amd(det.acumulado.aniosEfectivos, det.acumulado.mesesEfectivos, det.acumulado.diasEfectivos) }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- NIVEL 2 — desglose por período (aniversario a aniversario) -->
          <h3 class="seccion">Récord por período (año de servicio)</h3>
          <p class="seccion-hint">Cada año de servicio se evalúa con SUS incidencias. Solo los que cumplen récord generan 30 días.</p>
          <table class="periodos">
            <thead>
              <tr>
                <th>#</th>
                <th>Ventana</th>
                <th class="num">LSG</th>
                <th class="num">Faltas</th>
                <th class="num">Efectivo</th>
                <th>Récord</th>
                <th class="num">Días</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of det.periodos">
                <td>{{ p.numero }}</td>
                <td class="ventana">{{ fecha(p.desde) }} → {{ fecha(p.hasta) }}</td>
                <td class="num" [class.inci]="p.lsg > 0">{{ p.lsg }}</td>
                <td class="num" [class.inci]="p.faltas > 0">{{ p.faltas }}</td>
                <td class="num">{{ p.diasEfectivos }} d</td>
                <td>
                  <span class="badge" [ngClass]="p.recordOk ? 'badge--success' : 'badge--danger'">
                    {{ p.recordOk ? 'Cumple' : 'No cumple' }}
                  </span>
                </td>
                <td class="num strong">{{ p.diasGanados }}</td>
              </tr>
              <tr *ngIf="det.periodos.length === 0">
                <td colspan="7" class="empty">Aún no completa un año de servicio.</td>
              </tr>
            </tbody>
          </table>
        </ng-container>
      </ng-container>

      <p class="nota">
        <strong>Base normativa:</strong> D.Leg. 1405 (art. 2) y D.S. 013-2019-PCM (art. 11).
        El récord vacacional exige un año de servicios <em>efectivos</em> POR PERÍODO. La licencia
        sin goce (suspensión perfecta) y las faltas injustificadas no computan y postergan el
        aniversario. Cómputo 30/360. Aplica a D.L. 276, CAS (1057) y SERVIR (30057). La antigüedad
        bruta (para CTS/LBS) se ve en Configuración Remunerativa.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .empleado-info {
        padding: 1rem;
        background: #f5f5f5;
        border-radius: 4px;
      }
      .sin-vinculo {
        margin-top: 1rem;
        padding: 0.75rem;
        background: #fef3c7;
        border: 1px solid #fcd34d;
        color: #92400e;
        border-radius: 6px;
        font-size: 0.85rem;
      }
      .cargando {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin: 1rem 0;
        color: #64748b;
        font-size: 0.85rem;
      }
      .seccion {
        margin: 1.1rem 0 0.1rem;
        font-size: 0.92rem;
        font-weight: 700;
        color: #0f172a;
      }
      .seccion-hint {
        margin: 0 0 0.4rem;
        font-size: 0.72rem;
        color: #64748b;
      }
      .desglose {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }
      .desglose td {
        padding: 0.4rem 0.2rem;
        border-bottom: 1px solid #eee;
      }
      .desglose .val {
        text-align: right;
        font-weight: 600;
      }
      .desglose .resta td {
        color: #b91c1c;
      }
      .desglose .total td {
        border-top: 2px solid #cbd5e1;
        font-weight: 700;
      }
      .periodos {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
        margin-top: 0.2rem;
      }
      .periodos th,
      .periodos td {
        padding: 0.35rem 0.4rem;
        border-bottom: 1px solid #eee;
        text-align: left;
      }
      .periodos th {
        background: #f8fafc;
        font-weight: 600;
        color: #475569;
      }
      .periodos .num {
        text-align: right;
      }
      .periodos .ventana {
        white-space: nowrap;
        color: #475569;
      }
      .periodos .inci {
        color: #b91c1c;
        font-weight: 700;
      }
      .periodos .strong {
        font-weight: 700;
      }
      .periodos .empty {
        text-align: center;
        color: #94a3b8;
        padding: 0.75rem;
      }
      .badge {
        padding: 0.1rem 0.45rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .badge--success {
        background: #dcfce7;
        color: #166534;
      }
      .badge--danger {
        background: #fee2e2;
        color: #991b1b;
      }
      .nota {
        margin-top: 1rem;
        font-size: 0.72rem;
        color: #64748b;
        line-height: 1.4;
      }
      .traza {
        margin-bottom: 1rem;
        border: 1.5px dashed #b45309;
        background: #fef3c7;
        border-radius: 8px;
        padding: 0.75rem 0.9rem;
      }
      .traza-head {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: #92400e;
        font-weight: 700;
        font-size: 0.82rem;
      }
      .traza-head mat-icon {
        font-size: 1.05rem;
        width: 1.05rem;
        height: 1.05rem;
      }
      .traza-grid {
        margin: 0.6rem 0 0;
        display: grid;
        grid-template-columns: auto 1fr;
        row-gap: 0.35rem;
        column-gap: 0.7rem;
        font-size: 0.82rem;
      }
      .traza-grid dt {
        color: #92400e;
        opacity: 0.85;
        font-weight: 600;
        white-space: nowrap;
      }
      .traza-grid dd {
        margin: 0;
        color: #1e293b;
      }
      .traza-hint {
        margin: 0.6rem 0 0;
        font-size: 0.72rem;
        color: #92400e;
        opacity: 0.85;
      }
      .mono {
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      }
      .badge--override { background: #b45309; color: #fff; }
      .badge--secondary { background: #f1f5f9; color: #475569; }
    `,
  ],
})
export class VacacionDetalleDialogComponent {
  readonly data = inject<PadronVacacionalRowDto>(MAT_DIALOG_DATA);
  private readonly api = inject(PadronVacacionalApiService);

  readonly detalle = signal<RecordVacacionalDetalle | null>(null);
  readonly cargando = signal(false);

  constructor() {
    if (!this.data.sinVinculo && this.data.empleadoId != null) {
      this.cargando.set(true);
      this.api.recordDetalle(this.data.empleadoId).subscribe({
        next: (resp) => {
          this.detalle.set(resp.data ?? null);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
    }
  }

  /** Formatea años/meses/días omitiendo los componentes en cero (salvo días). */
  amd(anios: number | null, meses: number | null, dias: number | null): string {
    const a = anios ?? 0;
    const m = meses ?? 0;
    const d = dias ?? 0;
    const partes: string[] = [];
    if (a > 0) partes.push(`${a}a`);
    if (m > 0) partes.push(`${m}m`);
    partes.push(`${d}d`);
    return partes.join(' ');
  }

  amdTs(ts: { anios: number; meses: number; dias: number } | null): string {
    if (!ts) return '—';
    return this.amd(ts.anios, ts.meses, ts.dias);
  }

  /** ISO 'YYYY-MM-DD' → 'DD/MM/YY'. */
  fecha(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  }
}
