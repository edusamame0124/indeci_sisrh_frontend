import type {
  SubsidioCasoResponse,
  SubsidioLiquidacionResponse,
  SubsidioValidacion,
} from '../models/subsidio.models';
import { labelSeveridadValidacion } from './subsidio-calculo-display.utils';

/** Pasos operativos del flujo F3 (índice 0–4). */
export const SUBSIDIO_FLUJO_PASOS = [
  { index: 0, label: 'Datos', shortLabel: 'Datos' },
  { index: 1, label: 'Tramos', shortLabel: 'Tramos' },
  { index: 2, label: 'Cálculo', shortLabel: 'Cálculo' },
  { index: 3, label: 'Planilla', shortLabel: 'Planilla' },
  { index: 4, label: 'Información complementaria', shortLabel: 'Complementaria' },
] as const;

export type SubsidioFlujoPasoIndex = 0 | 1 | 2 | 3 | 4;

export interface SubsidioFlujoCompletitud {
  readonly datos: boolean;
  readonly tramos: boolean;
  readonly calculo: boolean;
  readonly planilla: boolean;
  readonly finalizado: boolean;
}

export interface SubsidioBannerAccion {
  readonly label: string;
  readonly pasoDestino: SubsidioFlujoPasoIndex;
}

/** Deriva período de planilla AAAAMM desde fecha de inicio del descanso. */
export function periodoPlanillaDesdeCaso(caso: SubsidioCasoResponse): string {
  const raw = caso.fechaInicio?.slice(0, 7).replace('-', '') ?? '';
  return raw.length === 6 ? raw : '—';
}

/** Muestra el monto cuando existe liquidación calculada o ya aplicada. */
export function mostrarMontoPlanilla(
  _caso: SubsidioCasoResponse | null,
  liquidacion: SubsidioLiquidacionResponse | null,
): boolean {
  if (!liquidacion) return false;
  return liquidacion.estado === 'CALCULADO' || liquidacion.estado === 'APLICADO_PLANILLA';
}

export function montoTotalPlanilla(liquidacion: SubsidioLiquidacionResponse | null): number | null {
  if (!liquidacion) return null;
  const total = liquidacion.subsidioEstimado + liquidacion.diferencialIndeci;
  return Number.isFinite(total) ? total : null;
}

export function calcularCompletitudFlujo(
  caso: SubsidioCasoResponse | null,
  tieneBase: boolean,
  liquidacion: SubsidioLiquidacionResponse | null,
): SubsidioFlujoCompletitud {
  const tramos = caso?.tramos?.length ?? 0;
  const citts = caso?.citts?.length ?? 0;
  const datosOk = !!caso && !!caso.fechaInicio && !!caso.fechaFin;
  const tramosOk = tramos > 0;
  const calculoOk =
    tieneBase &&
    !!liquidacion &&
    (liquidacion.estado === 'CALCULADO' || liquidacion.estado === 'APLICADO_PLANILLA');
  const planillaOk = caso?.estado === 'APLICADO_PLANILLA' || liquidacion?.estado === 'APLICADO_PLANILLA';
  const finalizadoOk =
    caso?.estado === 'APLICADO_PLANILLA' ||
    caso?.estado === 'CERRADO' ||
    liquidacion?.estado === 'APLICADO_PLANILLA';

  return {
    datos: datosOk && citts > 0,
    tramos: tramosOk,
    calculo: calculoOk,
    planilla: planillaOk,
    finalizado: finalizadoOk,
  };
}

/** Validaciones críticas (máx. 2) para el banner. */
export function requisitosCriticosBanner(
  validaciones: readonly SubsidioValidacion[],
  caso: SubsidioCasoResponse | null,
  tieneBase: boolean,
  liquidacion: SubsidioLiquidacionResponse | null,
): readonly string[] {
  const items: string[] = [];

  for (const v of validaciones) {
    if (v.severidad !== 'BLOQUEO' && v.severidad !== 'ALERTA') continue;
    const texto = `${labelSeveridadValidacion(v.severidad)}: ${v.mensaje}`;
    if (!items.includes(texto)) items.push(texto);
    if (items.length >= 2) return items;
  }

  if (caso && (caso.citts?.length ?? 0) === 0) {
    items.push('Registre al menos un certificado CITT o sustento.');
  }
  if (caso && (caso.tramos?.length ?? 0) === 0 && items.length < 2) {
    items.push('Genere los tramos mensuales del descanso.');
  }
  if (caso && (caso.tramos?.length ?? 0) > 0 && !tieneBase && items.length < 2) {
    items.push('Calcule la base histórica antes de liquidar.');
  }
  if (
    caso &&
    (caso.tramos?.length ?? 0) > 0 &&
    tieneBase &&
    !liquidacion &&
    items.length < 2
  ) {
    items.push('Calcule la liquidación del tramo seleccionado.');
  }
  if (
    liquidacion &&
    liquidacion.estado === 'CALCULADO' &&
    caso?.estado === 'BORRADOR' &&
    items.length < 2
  ) {
    items.push('Envíe el caso a validación antes de aplicar a planilla.');
  }

  return items.slice(0, 2);
}

/** Acción prioritaria única según el paso activo y el estado del caso. */
export function accionPrioritariaFlujo(
  pasoActivo: SubsidioFlujoPasoIndex,
  caso: SubsidioCasoResponse | null,
  tieneBase: boolean,
  liquidacion: SubsidioLiquidacionResponse | null,
): SubsidioBannerAccion {
  if (!caso) {
    return { label: 'Espere la carga del caso', pasoDestino: 0 };
  }

  const sinCitt = (caso.citts?.length ?? 0) === 0;
  const sinTramos = (caso.tramos?.length ?? 0) === 0;
  const liqCalculada = liquidacion?.estado === 'CALCULADO';
  const liqAplicada = liquidacion?.estado === 'APLICADO_PLANILLA';

  if (pasoActivo === 0) {
    if (sinCitt) return { label: 'Registrar CITT o sustento', pasoDestino: 0 };
    if (sinTramos) return { label: 'Ir a tramos y días', pasoDestino: 1 };
    return { label: 'Revisar datos del descanso', pasoDestino: 0 };
  }

  if (pasoActivo === 1) {
    if (sinTramos) return { label: 'Generar tramos mensuales', pasoDestino: 1 };
    if (!tieneBase) return { label: 'Continuar al cálculo', pasoDestino: 2 };
    return { label: 'Revisar tramos y días', pasoDestino: 1 };
  }

  if (pasoActivo === 2) {
    if (!tieneBase) return { label: 'Calcular base histórica', pasoDestino: 2 };
    if (!liquidacion) return { label: 'Calcular liquidación', pasoDestino: 2 };
    if (liqCalculada) return { label: 'Continuar a aplicación en planilla', pasoDestino: 3 };
    return { label: 'Revisar cálculo y validación', pasoDestino: 2 };
  }

  if (pasoActivo === 3) {
    if (liqAplicada) return { label: 'Ver información complementaria', pasoDestino: 4 };
    if (liqCalculada && caso.estado === 'BORRADOR') {
      return { label: 'Enviar a validación', pasoDestino: 0 };
    }
    if (liqCalculada) return { label: 'Aplicar a planilla', pasoDestino: 3 };
    if (!tieneBase) return { label: 'Ir al cálculo', pasoDestino: 2 };
    if (sinTramos) return { label: 'Ir a tramos y días', pasoDestino: 1 };
    return { label: 'Calcular liquidación', pasoDestino: 2 };
  }

  return { label: 'Consultar detalle complementario', pasoDestino: 4 };
}
