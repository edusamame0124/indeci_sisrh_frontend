import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { LegajoStateService } from '../../services/legajo-state';

@Component({
  selector: 'app-legajo-documentos-complementarios',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './legajo-documentos-complementarios.component.html',
  styleUrl: './legajo-documentos-complementarios.component.scss',
})
export class LegajoDocumentosComplementariosComponent {
  readonly legajoState = inject(LegajoStateService);

  subirDocumento(): void {
    console.log('Pendiente abrir dialog de subir documento');
  }
}