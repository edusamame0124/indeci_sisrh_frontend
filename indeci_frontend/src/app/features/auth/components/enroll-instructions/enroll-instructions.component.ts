import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Instrucciones paso a paso para configurar el segundo factor (FR-015).
 * Estilo corporativo: tipografía sobria, lista compacta, apps en píldoras.
 */
@Component({
  selector: 'app-enroll-instructions',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="instr" aria-label="Cómo configurar el segundo factor">
      <h2 class="instr__title">Pasos para completar la activación</h2>

      <ol class="steps">
        <li class="step">
          <span class="step__num" aria-hidden="true">1</span>
          <div class="step__body">
            <p class="step__text">
              Instale una aplicación autenticadora en su dispositivo móvil.
            </p>
            <ul class="app-pills" aria-label="Aplicaciones compatibles recomendadas">
              <li class="app-pill">
                <mat-icon class="app-pill__ic" fontIcon="smartphone" aria-hidden="true" />
                Google Authenticator
              </li>
              <li class="app-pill">
                <mat-icon class="app-pill__ic" fontIcon="smartphone" aria-hidden="true" />
                Microsoft Authenticator
              </li>
              <li class="app-pill">
                <mat-icon class="app-pill__ic" fontIcon="smartphone" aria-hidden="true" />
                Authy
              </li>
            </ul>
          </div>
        </li>

        <li class="step">
          <span class="step__num" aria-hidden="true">2</span>
          <div class="step__body">
            <p class="step__text">
              En la aplicación, elija <strong>Agregar cuenta</strong> o el botón <strong>+</strong>.
            </p>
          </div>
        </li>

        <li class="step">
          <span class="step__num" aria-hidden="true">3</span>
          <div class="step__body">
            <p class="step__text">
              Escanee el <strong>código QR</strong> de esta pantalla con la cámara de la aplicación.
            </p>
          </div>
        </li>

        <li class="step">
          <span class="step__num" aria-hidden="true">4</span>
          <div class="step__body">
            <p class="step__text">
              La aplicación mostrará un código de <strong>6 dígitos</strong> que se renueva
              aproximadamente cada <strong>30 segundos</strong>.
            </p>
          </div>
        </li>

        <li class="step">
          <span class="step__num" aria-hidden="true">5</span>
          <div class="step__body">
            <p class="step__text">
              Escriba el código actual en el campo de confirmación más abajo.
            </p>
          </div>
        </li>
      </ol>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .instr__title {
        font-size: 0.9375rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: #64748b;
        margin: 0 0 1.25rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .steps {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .step {
        display: grid;
        grid-template-columns: 1.625rem minmax(0, 1fr);
        gap: 0.75rem;
        align-items: start;
      }
      .step__num {
        width: 1.625rem;
        height: 1.625rem;
        border-radius: 50%;
        border: 1px solid #cbd5e1;
        color: #0f172a;
        background: #f8fafc;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.75rem;
        line-height: 1;
        margin-top: 0.125rem;
      }
      .step__body {
        min-width: 0;
      }
      .step__text {
        margin: 0;
        line-height: 1.55;
        color: #334155;
        font-size: 0.9375rem;
      }

      .app-pills {
        list-style: none;
        padding: 0;
        margin: 0.625rem 0 0;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .app-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
        font-weight: 500;
        color: #0f172a;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
      }
      .app-pill__ic {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: #475569;
      }
    `,
  ],
})
export class EnrollInstructionsComponent {}
