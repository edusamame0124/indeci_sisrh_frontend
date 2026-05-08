import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Renderiza el QR del enroll OTP con un diseño visual cuidado.
 *
 * El backend envía la URL en `OtpEnrollResponse.qrImage`. Puede ser:
 *  - Data URL (`data:image/png;base64,...`) — generación local (futuro)
 *  - URL HTTP externa (api.qrserver.com en backend actual — ver Spec 008)
 *
 * Ambos casos los renderiza el `<img>` nativo. Alt text descriptivo (FR-035).
 */
@Component({
  selector: 'app-qr-display',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (qr()) {
      <figure class="qr-wrap">
        <div class="qr-surface">
          <img
            [src]="qr()"
            (load)="onLoaded()"
            (error)="onError()"
            alt="Código QR para configurar el segundo factor con tu aplicación autenticadora"
            class="qr-image"
            [class.is-hidden]="!loaded()"
          />
          @if (!loaded() && !errored()) {
            <div class="qr-overlay" role="status" aria-live="polite">
              <mat-progress-spinner mode="indeterminate" diameter="32" />
            </div>
          }
          @if (errored()) {
            <div class="qr-overlay qr-overlay--error" role="alert">
              No pudimos cargar la imagen.<br />Recarga la página o vuelve al inicio.
            </div>
          }
        </div>
        <figcaption class="qr-caption">
          Escanea con tu aplicación autenticadora
        </figcaption>
      </figure>
    } @else {
      <figure class="qr-wrap">
        <div class="qr-surface qr-surface--empty" role="status" aria-live="polite">
          <mat-progress-spinner mode="indeterminate" diameter="32" />
          <p class="qr-placeholder-msg">Generando código QR…</p>
        </div>
      </figure>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .qr-wrap {
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
        width: 100%;
      }
      .qr-surface {
        position: relative;
        margin: 0 auto;
        width: min(100%, clamp(260px, 42vw, 320px));
        aspect-ratio: 1;
        padding: clamp(14px, 3vw, 20px);
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .qr-surface--empty {
        flex-direction: column;
        gap: 0.75rem;
        color: #64748b;
        font-size: 0.875rem;
      }
      .qr-image {
        width: 100%;
        height: 100%;
        max-width: 280px;
        max-height: 280px;
        object-fit: contain;
        border-radius: 4px;
        display: block;
        transition: opacity 200ms ease;
      }
      .qr-image.is-hidden {
        opacity: 0;
      }
      .qr-overlay {
        position: absolute;
        inset: clamp(14px, 3vw, 20px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.98);
      }
      .qr-overlay--error {
        text-align: center;
        padding: 0.75rem;
        color: var(--sisrh-color-error);
        font-size: 0.8125rem;
        font-weight: 500;
        line-height: 1.4;
      }
      .qr-placeholder-msg {
        margin: 0;
      }
      .qr-caption {
        margin: 0;
        text-align: center;
        color: #64748b;
        font-size: 0.8125rem;
        line-height: 1.45;
      }
    `,
  ],
})
export class QrDisplayComponent {
  readonly qr = input<string>('');
  readonly loaded = signal(false);
  readonly errored = signal(false);

  onLoaded(): void {
    this.loaded.set(true);
    this.errored.set(false);
  }

  onError(): void {
    this.errored.set(true);
    this.loaded.set(false);
  }
}
