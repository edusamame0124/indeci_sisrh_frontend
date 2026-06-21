import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import type { SubsidioFlujoCompletitud } from '../../../utils/subsidio-flujo.utils';

const PROGRESO_LABELS = [
  'Datos',
  'Tramos',
  'Cálculo',
  'Planilla',
  'Finalizado',
] as const;

@Component({
  selector: 'app-subsidio-flujo-stepper',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flujo-stepper" aria-label="Progreso del caso de subsidio">
      <ol class="flujo-stepper__list">
        @for (label of labels; track label; let i = $index) {
          <li
            class="flujo-stepper__item"
            [class.flujo-stepper__item--active]="i === activeIndex()"
            [class.flujo-stepper__item--done]="completed()[i]"
          >
            <span class="flujo-stepper__marker" aria-hidden="true">
              @if (completed()[i] && i !== activeIndex()) {
                <mat-icon fontIcon="check" />
              } @else {
                {{ i + 1 }}
              }
            </span>
            <span class="flujo-stepper__label">{{ label }}</span>
            @if (i < labels.length - 1) {
              <span class="flujo-stepper__connector" aria-hidden="true"></span>
            }
          </li>
        }
      </ol>
      <p class="flujo-stepper__sr-only">
        Paso {{ activeIndex() + 1 }} de {{ labels.length }}: {{ labels[activeIndex()] }}.
      </p>
    </nav>
  `,
  styles: `
    .flujo-stepper {
      padding: 12px 16px;
      background: var(--sisrh-surface, #fff);
      border: 1px solid var(--sisrh-border, #d9e1ea);
      border-radius: 8px;
    }

    .flujo-stepper__list {
      display: flex;
      list-style: none;
      margin: 0;
      padding: 0;
      gap: 0;
      flex-wrap: wrap;
    }

    .flujo-stepper__item {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 0;
      min-width: 88px;
      position: relative;
      padding-right: 8px;
    }

    .flujo-stepper__marker {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 600;
      background: #e7ecf2;
      color: #64748b;
      flex-shrink: 0;
    }

    .flujo-stepper__item--active .flujo-stepper__marker {
      background: var(--sisrh-primary, #1f3a5f);
      color: #fff;
    }

    .flujo-stepper__item--done .flujo-stepper__marker {
      background: #e8f5ee;
      color: #15803d;
    }

    .flujo-stepper__item--done.flujo-stepper__item--active .flujo-stepper__marker {
      background: var(--sisrh-primary, #1f3a5f);
      color: #fff;
    }

    .flujo-stepper__label {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
      line-height: 1.2;
    }

    .flujo-stepper__item--active .flujo-stepper__label {
      color: var(--sisrh-primary, #1f3a5f);
      font-weight: 600;
    }

    .flujo-stepper__connector {
      flex: 1;
      height: 2px;
      background: #e7ecf2;
      min-width: 12px;
      margin-left: 4px;
    }

    .flujo-stepper__item--done .flujo-stepper__connector {
      background: #86efac;
    }

    .flujo-stepper__sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 720px) {
      .flujo-stepper__label {
        font-size: 11px;
      }
      .flujo-stepper__item {
        min-width: 72px;
      }
    }
  `,
})
export class SubsidioFlujoStepperComponent {
  readonly tabIndex = input(0);
  readonly completitud = input.required<SubsidioFlujoCompletitud>();

  readonly labels = PROGRESO_LABELS;

  readonly completed = computed(() => {
    const c = this.completitud();
    return [
      c.datos,
      c.tramos,
      c.calculo,
      c.planilla,
      c.finalizado,
    ];
  });

  readonly activeIndex = computed(() => {
    const tab = this.tabIndex();
    if (tab <= 3) return tab;
    return this.completitud().finalizado ? 4 : 3;
  });
}
