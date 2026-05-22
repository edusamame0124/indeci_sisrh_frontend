import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EmpleadoFlowService } from '../../services/empleado-flow.service';
import { EMPLEADO_FLUJO_PASOS } from '../empleado-stepper/empleado-stepper.component';

/**
 * Mapeo paso → segmentos relativos a `/empleados`. Acepta `personaId` para construir la ruta final.
 * 0 = Datos personales (edit), 1..5 = sub-flujos por persona.
 */
function pendingStepRoute(stepIndex: number, personaId: number): readonly (string | number)[] {
  switch (stepIndex) {
    case 0:
      return ['/empleados/personas', personaId, 'editar'];
    case 1:
      return ['/empleados/puesto/personas', personaId];
    case 2:
      return ['/empleados/cuentas-bancarias/personas', personaId];
    case 3:
      return ['/empleados/pension/personas', personaId];
    case 4:
      return ['/empleados/planilla/personas', personaId];
    case 5:
      return ['/empleados/conceptos/personas', personaId];
    default:
      return ['/empleados/personas', personaId];
  }
}

function clampStepIndex(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const last = EMPLEADO_FLUJO_PASOS.length - 1;
  return Math.max(0, Math.min(last, Math.trunc(n)));
}

function normalizePositiveInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.trunc(n);
}

/**
 * Banner soft (Spec 009 / T141) que sugiere al usuario completar un paso previo pendiente.
 * - Lee `EmpleadoFlowService.completedSteps(empleadoId)`.
 * - Muestra el PRIMER paso `i < currentStep` con `completed[i] === false`.
 * - Si todos los pasos previos están completos, el banner queda oculto (no renderiza).
 */
@Component({
  selector: 'app-empleado-flow-warning-banner',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-flow-warning-banner.component.html',
  styleUrl: './empleado-flow-warning-banner.component.css',
})
export class EmpleadoFlowWarningBannerComponent {
  private readonly flow = inject(EmpleadoFlowService);

  readonly empleadoId = input(0, { transform: normalizePositiveInt });
  readonly personaId = input(0, { transform: normalizePositiveInt });
  readonly currentStep = input(0, { transform: clampStepIndex });

  /** Índice del primer paso previo no completado, o `null` si todos están listos. */
  readonly pendingStepIndex = computed<number | null>(() => {
    const eid = this.empleadoId();
    if (eid < 1) return null;
    const completed = this.flow.completedSteps(eid)();
    const current = this.currentStep();
    for (let i = 0; i < current; i++) {
      if (completed[i] !== true) return i;
    }
    return null;
  });

  readonly pendingStepLabel = computed(() => {
    const i = this.pendingStepIndex();
    return i === null ? '' : EMPLEADO_FLUJO_PASOS[i].label;
  });

  readonly pendingStepRouterLink = computed<readonly (string | number)[]>(() => {
    const i = this.pendingStepIndex();
    if (i === null) return [];
    return pendingStepRoute(i, this.personaId());
  });

  readonly visible = computed(() => this.pendingStepIndex() !== null);
}
