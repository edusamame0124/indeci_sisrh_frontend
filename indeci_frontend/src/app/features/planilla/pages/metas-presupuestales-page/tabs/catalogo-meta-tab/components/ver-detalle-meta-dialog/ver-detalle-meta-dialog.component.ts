import { Component, Inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { MetaPptoCat } from '../../../../../../models/meta-ppto.model';

export interface VerDetalleMetaDialogData {
  meta: MetaPptoCat;
}

@Component({
  selector: 'app-ver-detalle-meta-dialog',
  standalone: true,
  imports: [NgClass, DatePipe, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './ver-detalle-meta-dialog.component.html',
  styleUrl: './ver-detalle-meta-dialog.component.css',
})
export class VerDetalleMetaDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: VerDetalleMetaDialogData,
  ) {}

  estadoClass(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'badge-warn',
      VALIDADO: 'badge-info',
      PUBLICADO: 'badge-ok',
      CERRADO: 'badge-gray',
      ANULADO: 'badge-err',
    };
    return mapa[estado] ?? 'badge-gray';
  }

  estadoLabel(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'Borrador',
      VALIDADO: 'Validado',
      PUBLICADO: 'Publicado',
      CERRADO: 'Cerrado',
      ANULADO: 'Anulado',
    };
    return mapa[estado] ?? estado;
  }
}
