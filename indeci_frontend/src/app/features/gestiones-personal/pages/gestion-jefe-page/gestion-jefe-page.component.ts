import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/**
 * Gestión del jefe inmediato.
 * Pantalla base del módulo "Gestiones del personal" (solo frontend).
 * El cuerpo de la tarjeta queda listo para incorporar el contenido funcional.
 */
@Component({
  selector: 'app-gestion-jefe-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gestion-jefe-page.component.html',
  styleUrl: './gestion-jefe-page.component.css',
})
export class GestionJefePageComponent {}
