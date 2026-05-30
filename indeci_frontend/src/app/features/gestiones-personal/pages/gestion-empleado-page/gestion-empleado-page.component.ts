import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/**
 * Gestión del empleado.
 * Pantalla base del módulo "Gestiones del personal" (solo frontend).
 * El cuerpo de la tarjeta queda listo para incorporar el contenido funcional.
 */
@Component({
  selector: 'app-gestion-empleado-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gestion-empleado-page.component.html',
  styleUrl: './gestion-empleado-page.component.css',
})
export class GestionEmpleadoPageComponent {}
