import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

/**
 * Cuenta inactiva (FR-028). Mensaje institucional; sin reintento automático.
 */
@Component({
  selector: 'app-inactive-account-page',
  standalone: true,
  imports: [MatCardModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="auth-info-card" role="region" aria-labelledby="inactive-title">
      <mat-card-header>
        <mat-card-title id="inactive-title">Cuenta inactiva</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="lead" role="alert">
          Tu cuenta está inactiva. Contacta a Mesa de Ayuda.
        </p>
        <p class="muted">
          Si necesitas soporte técnico, indica tu usuario institucional y el mensaje que ves en
          pantalla.
        </p>
        <button mat-stroked-button type="button" color="primary" class="action" disabled>
          Reintentar inicio de sesión
        </button>
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
        margin: 0 0 1.25rem;
        color: #555;
        font-size: 0.95rem;
      }
      .action {
        width: 100%;
      }
    `,
  ],
})
export class InactiveAccountPageComponent {}
