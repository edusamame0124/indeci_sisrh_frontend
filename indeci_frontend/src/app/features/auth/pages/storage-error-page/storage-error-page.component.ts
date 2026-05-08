import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

/**
 * Almacenamiento del navegador no disponible (FR-030). Modo incógnito o restricciones.
 */
@Component({
  selector: 'app-storage-error-page',
  standalone: true,
  imports: [MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="auth-info-card" role="region" aria-labelledby="storage-title">
      <mat-card-header>
        <mat-card-title id="storage-title">No pudimos usar el almacenamiento del navegador</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="lead" role="alert">
          Cierra la ventana de incógnito o prueba con otro navegador. Necesitamos guardar la sesión
          de forma segura en este equipo.
        </p>
        <p class="muted">
          Si el problema continúa, contacta a Mesa de Ayuda e indica que la aplicación no puede
          acceder al almacenamiento local.
        </p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .auth-info-card {
        width: 100%;
        max-width: 480px;
        padding: 1.25rem;
      }
      .lead {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        line-height: 1.5;
      }
      .muted {
        margin: 0;
        color: #555;
        font-size: 0.95rem;
      }
    `,
  ],
})
export class StorageErrorPageComponent {}
