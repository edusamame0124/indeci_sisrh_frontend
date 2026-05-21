import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';

/** Orden alineado a `main-navigation.config` → Empleados (Spec 009). Índices 0…5. */
export const EMPLEADO_FLUJO_PASOS = [
  { index: 0, label: 'Datos personales', icon: 'person' },
  { index: 1, label: 'Puesto laboral', icon: 'badge' },
  { index: 2, label: 'Cuenta bancaria', icon: 'account_balance' },
  { index: 3, label: 'Configuración pensión', icon: 'savings' },
  { index: 4, label: 'Configuración planilla', icon: 'payments' },
  { index: 5, label: 'Conceptos asignados', icon: 'list_alt' },
] as const;

const DEFAULT_COMPLETED: readonly boolean[] = [
  false,
  false,
  false,
  false,
  false,
  false,
];

function clampStepIndex(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const last = EMPLEADO_FLUJO_PASOS.length - 1;
  return Math.max(0, Math.min(last, Math.trunc(n)));
}

@Component({
  selector: 'app-empleado-stepper',
  standalone: true,
  imports: [MatStepperModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-stepper.component.html',
  styleUrl: './empleado-stepper.component.css',
})
export class EmpleadoStepperComponent {
  /** Índice del paso activo (0…5). Valores fuera de rango se recortan. */
  readonly currentStep = input(0, { transform: clampStepIndex });

  /**
   * Longitud 6: cada posición indica si ese paso está completado.
   * Si el arreglo es más corto, el resto se trata como false; entradas extra se ignoran.
   */
  readonly completedSteps = input<readonly boolean[]>(DEFAULT_COMPLETED);

  readonly steps = EMPLEADO_FLUJO_PASOS;

  readonly completedFlags = computed(() => {
    const raw = this.completedSteps();
    return EMPLEADO_FLUJO_PASOS.map((_, i) => raw[i] === true);
  });
}
