import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { LegajoStateService } from '../../services/legajo-state';

@Component({
  selector: 'app-legajo-formacion-desarrollo',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './legajo-formacion-desarrollo.component.html',
  styleUrl: './legajo-formacion-desarrollo.component.scss',
})
export class LegajoFormacionDesarrolloComponent {
  readonly legajoState = inject(LegajoStateService);

  agregarCapacitacion(): void {
    console.log('Pendiente abrir dialog de capacitación');
  }

  agregarFormacion(): void {
    console.log('Pendiente abrir dialog de formación académica');
  }

  agregarIdioma(): void {
    console.log('Pendiente abrir dialog de idioma');
  }

  agregarConocimiento(): void {
    console.log('Pendiente abrir dialog de conocimiento informático');
  }
}