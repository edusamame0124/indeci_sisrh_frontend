import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { LegajoStateService } from '../../services/legajo-state';

@Component({
  selector: 'app-legajo-trayectoria-laboral',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './legajo-trayectoria-laboral.component.html',
  styleUrl: './legajo-trayectoria-laboral.component.scss',
})
export class LegajoTrayectoriaLaboralComponent {
  readonly legajoState = inject(LegajoStateService);

  agregarExperiencia(): void {
    console.log('Pendiente abrir dialog de experiencia laboral');
  }
}