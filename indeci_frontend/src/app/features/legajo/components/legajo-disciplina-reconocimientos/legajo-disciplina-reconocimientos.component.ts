import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { LegajoStateService } from '../../services/legajo-state';

@Component({
  selector: 'app-legajo-disciplina-reconocimientos',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './legajo-disciplina-reconocimientos.component.html',
  styleUrl: './legajo-disciplina-reconocimientos.component.scss',
})
export class LegajoDisciplinaReconocimientosComponent {
  readonly legajoState = inject(LegajoStateService);

  agregarReconocimiento(): void {
    console.log('Pendiente abrir dialog de reconocimiento');
  }

  agregarMedida(): void {
    console.log('Pendiente abrir dialog de medida disciplinaria');
  }
}