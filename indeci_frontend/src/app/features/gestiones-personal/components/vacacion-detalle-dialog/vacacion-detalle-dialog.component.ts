import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PadronVacacionalRowDto } from '../../models/padron-vacacional.model';

@Component({
  selector: 'app-vacacion-detalle-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
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

      <table *ngIf="!data.sinVinculo" class="desglose">
        <tbody>
          <tr>
            <td>Antigüedad (vínculo)</td>
            <td class="val">{{ amd(data.aniosServicio, data.mesesServicio, data.diasServicio) }}</td>
          </tr>
          <tr class="resta">
            <td>(−) Licencia sin goce</td>
            <td class="val">{{ data.diasNoComputablesLsg ?? 0 }} d</td>
          </tr>
          <tr class="resta">
            <td>(−) Faltas injustificadas</td>
            <td class="val">{{ data.diasNoComputablesFaltas ?? 0 }} d</td>
          </tr>
          <tr class="total">
            <td>= Tiempo efectivo p/ récord</td>
            <td class="val">{{ amd(data.aniosEfectivos, data.mesesEfectivos, data.diasEfectivos) }}</td>
          </tr>
          <tr>
            <td>Récord</td>
            <td class="val">
              <span class="badge" [ngClass]="recordClase()">{{ recordLabel() }}</span>
            </td>
          </tr>
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

      <p class="nota">
        <strong>Base normativa:</strong> D.Leg. 1405 (art. 2) y D.S. 013-2019-PCM (art. 11).
        El récord vacacional exige un año de servicios <em>efectivos</em>. La licencia sin goce
        (suspensión perfecta) y las faltas injustificadas no computan y postergan el aniversario.
        Cómputo 30/360. Aplica a D.L. 276, CAS (1057) y SERVIR (30057). La antigüedad bruta
        (para CTS/LBS) se ve en Configuración Remunerativa.
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
      .desglose {
        width: 100%;
        margin-top: 1rem;
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
      .badge {
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        font-size: 0.78rem;
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
      .badge--secondary {
        background: #e2e8f0;
        color: #475569;
      }
      .nota {
        margin-top: 1rem;
        font-size: 0.72rem;
        color: #64748b;
        line-height: 1.4;
      }
    `,
  ],
})
export class VacacionDetalleDialogComponent {
  readonly data = inject<PadronVacacionalRowDto>(MAT_DIALOG_DATA);

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

  recordLabel(): string {
    if (this.data.estadoRecord === 'OK') return 'Cumple récord';
    if (this.data.estadoRecord === 'SIN_RECORD_LEGAL') return 'Sin récord — año efectivo no cumplido';
    return this.data.estadoRecord;
  }

  recordClase(): string {
    if (this.data.estadoRecord === 'OK') return 'badge--success';
    if (this.data.estadoRecord === 'SIN_RECORD_LEGAL') return 'badge--danger';
    return 'badge--secondary';
  }
}
