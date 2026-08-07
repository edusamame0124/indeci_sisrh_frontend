import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { AsistenciaDiariaRow } from '../../../../models/asistencia-diaria.model';
import { badgeClass, condicionLabel, fmtMin } from '../../../../../../shared/utils/asistencia-display.utils';

export interface AsistenciaDiariaVerDialogData {
  readonly row: AsistenciaDiariaRow;
}

@Component({
  selector: 'app-asistencia-diaria-ver-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asistencia-diaria-ver-dialog.component.html',
  styleUrl: './asistencia-diaria-ver-dialog.component.css',
})
export class AsistenciaDiariaVerDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AsistenciaDiariaVerDialogComponent>);
  readonly data = inject<AsistenciaDiariaVerDialogData>(MAT_DIALOG_DATA);

  // Helpers de presentación compartidos (DRY).
  readonly condicionLabel = condicionLabel;
  readonly fmtMin = fmtMin;
  readonly badgeClass = badgeClass;

  /**
   * Minutos sin laborar por salida anticipada, visibles solo mientras la condición siga
   * Observado (decisión RR.HH. 2026-08-07). Si una papeleta ya la justificó, el backend
   * devuelve la condición como Presente con los minutos en cero y el tag deja de mostrarse.
   */
  get minutosSalidaAnticipadaPendiente(): number | null {
    const row = this.data.row;
    if (row.tipoDia !== 'OBSERVADO') return null;
    return row.minutosSalidaAnticipada && row.minutosSalidaAnticipada > 0
      ? row.minutosSalidaAnticipada
      : null;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
