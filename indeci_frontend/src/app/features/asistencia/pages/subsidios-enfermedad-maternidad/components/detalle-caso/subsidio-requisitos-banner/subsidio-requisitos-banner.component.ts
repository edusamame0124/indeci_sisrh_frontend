import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { formatSubsidioMonto } from '../../../utils/subsidio-calculo-display.utils';

@Component({
  selector: 'app-subsidio-requisitos-banner',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="req-banner" aria-labelledby="req-banner-titulo">
      <div class="req-banner__main">
        <div class="req-banner__accion">
          <h3 id="req-banner-titulo" class="req-banner__titulo">Qué debe hacer ahora</h3>
          <p class="req-banner__hint">{{ pasoActualLabel() }}</p>
          <button
            type="button"
            mat-flat-button
            color="primary"
            class="req-banner__cta"
            (click)="accionClick.emit()"
            [attr.aria-label]="accionLabel()"
          >
            {{ accionLabel() }}
          </button>
        </div>

        @if (mostrarMonto() && montoPlanilla() != null) {
          <div class="req-banner__monto" role="status">
            <span class="req-banner__monto-label">Monto que impactará planilla</span>
            <strong class="req-banner__monto-valor">{{ formatMonto(montoPlanilla()) }}</strong>
            <small class="req-banner__monto-nota">Subsidio EsSalud + diferencial INDECI</small>
          </div>
        }
      </div>

      @if (requisitos().length > 0) {
        <ul class="req-banner__requisitos" aria-label="Requisitos críticos pendientes">
          @for (req of requisitos(); track req) {
            <li>{{ req }}</li>
          }
        </ul>
      }
    </aside>
  `,
  styles: `
    .req-banner {
      padding: 16px 20px;
      border-radius: 8px;
      border: 1px solid #c7d7ea;
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    }

    .req-banner__main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
    }

    .req-banner__titulo {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--sisrh-primary, #1f3a5f);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .req-banner__hint {
      margin: 4px 0 12px;
      font-size: 13px;
      color: #64748b;
    }

    .req-banner__cta {
      min-width: 200px;
    }

    .req-banner__monto {
      text-align: right;
      padding: 8px 16px;
      background: #fff;
      border: 1px solid var(--sisrh-border, #d9e1ea);
      border-radius: 8px;
      min-width: 200px;
    }

    .req-banner__monto-label {
      display: block;
      font-size: 12px;
      color: #64748b;
    }

    .req-banner__monto-valor {
      display: block;
      font-size: 22px;
      color: var(--sisrh-primary, #1f3a5f);
      margin-top: 4px;
    }

    .req-banner__monto-nota {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }

    .req-banner__requisitos {
      margin: 12px 0 0;
      padding: 12px 16px 12px 32px;
      background: #fff4db;
      border-radius: 6px;
      font-size: 13px;
      color: #92400e;
    }

    .req-banner__requisitos li + li {
      margin-top: 6px;
    }
  `,
})
export class SubsidioRequisitosBannerComponent {
  readonly pasoActualLabel = input('Paso 1 — Datos del caso y descanso');
  readonly accionLabel = input('Revisar datos del descanso');
  readonly requisitos = input<readonly string[]>([]);
  readonly montoPlanilla = input<number | null>(null);
  readonly mostrarMonto = input(false);

  readonly accionClick = output<void>();

  readonly formatMonto = formatSubsidioMonto;
}
