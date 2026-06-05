import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface SuccessToastData {
  readonly titulo: string;
  readonly mensaje?: string;
}

/**
 * Toast de éxito reutilizable (estilo Flowbite "successfully"): banda verde con
 * check, título y mensaje opcional, cerrable. Se abre con
 * {@link NotificacionService.exito}. Convención: tras CADA registro exitoso.
 */
@Component({
  selector: 'app-success-toast',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast" role="status" aria-live="polite">
      <span class="toast__icon" aria-hidden="true">
        <mat-icon fontIcon="check_circle" />
      </span>
      <div class="toast__body">
        <p class="toast__title">{{ data.titulo }}</p>
        @if (data.mensaje) {
          <p class="toast__msg">{{ data.mensaje }}</p>
        }
      </div>
      <button
        mat-icon-button
        class="toast__close"
        type="button"
        aria-label="Cerrar"
        (click)="cerrar()"
      >
        <mat-icon fontIcon="close" />
      </button>
    </div>
  `,
  styles: `
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.5rem 0.5rem 0.5rem 0.75rem;
      min-width: 280px;
      background: #ffffff;
      border: 1px solid #c7e8d0;
      border-left: 4px solid #1e9e54;
      border-radius: 10px;
      box-shadow: 0 6px 20px rgb(15 23 42 / 12%);
    }
    .toast__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e6f4ea;
      color: #1e9e54;
      flex: 0 0 auto;
      margin-top: 2px;
    }
    .toast__icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .toast__body {
      flex: 1 1 auto;
    }
    .toast__title {
      margin: 0;
      font-weight: 700;
      font-size: 0.9rem;
      color: #14532d;
    }
    .toast__msg {
      margin: 0.1rem 0 0;
      font-size: 0.8rem;
      color: #3f6b4e;
      line-height: 1.3;
    }
    .toast__close {
      flex: 0 0 auto;
      color: #6b7280;
    }
  `,
})
export class SuccessToastComponent {
  readonly data = inject<SuccessToastData>(MAT_SNACK_BAR_DATA);
  private readonly ref = inject(MatSnackBarRef<SuccessToastComponent>);

  cerrar(): void {
    this.ref.dismiss();
  }
}
