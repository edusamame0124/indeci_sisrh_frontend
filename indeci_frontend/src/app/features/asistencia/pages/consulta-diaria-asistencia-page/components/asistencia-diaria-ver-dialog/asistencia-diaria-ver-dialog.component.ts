import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { AsistenciaDiariaRow } from '../../../../models/asistencia-diaria.model';
import { condicionLabel, fmtMin } from '../../../../utils/asistencia-diaria-display.utils';

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

  cerrar(): void {
    this.dialogRef.close();
  }
}
