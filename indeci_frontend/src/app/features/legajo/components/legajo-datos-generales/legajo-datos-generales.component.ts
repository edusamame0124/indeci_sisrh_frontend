import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { LegajoStateService } from '../../services/legajo-state';

@Component({
  selector: 'app-legajo-datos-generales',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './legajo-datos-generales.component.html',
  styleUrl: './legajo-datos-generales.component.scss',
})
export class LegajoDatosGeneralesComponent {
  readonly legajoState = inject(LegajoStateService);

  subirFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.legajoState.subirFoto(file);
  }
}