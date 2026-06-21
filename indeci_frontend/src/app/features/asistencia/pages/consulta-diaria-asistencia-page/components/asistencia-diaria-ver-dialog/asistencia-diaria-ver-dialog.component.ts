import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { AsistenciaDiariaRow } from '../../../../models/asistencia-diaria.model';
import { CONDICION_LABELS } from '../../../../models/asistencia-diaria.model';

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

  condicionLabel(tipo: string | null | undefined): string {
    if (!tipo) return '—';
    return CONDICION_LABELS[tipo] ?? tipo;
  }

  fmtMin(value: number | null | undefined): string {
    if (value == null || value <= 0) return '—';
    const h = Math.floor(value / 60);
    const m = value % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
