import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LegajoStateService } from '../../services/legajo-state';

@Component({
  selector: 'app-legajo-shell-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,

    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './legajo-shell-page.component.html',
  styleUrl: './legajo-shell-page.component.scss',
})
export class LegajoShellPageComponent {
  readonly legajoState = inject(LegajoStateService);

  personaIdInput = '';

  buscar(): void {
    const personaId = Number(this.personaIdInput);

    if (!personaId || Number.isNaN(personaId)) {
      this.legajoState.error.set('Ingrese un personaId válido.');
      return;
    }

    this.legajoState.cargarPorPersonaId(personaId);
  }
}