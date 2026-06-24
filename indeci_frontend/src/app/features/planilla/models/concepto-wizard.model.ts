import type {
  ConceptoPlanillaTipo,
  ConceptoPlanillaTipoConcepto,
} from './concepto-planilla.model';

/**
 * Modos de cálculo del concepto (SPEC_CONCEPTOS_PLANILLA §3.A · TAB 2).
 * Campo de presentación: el motor v3 ya conoce cómo valorizar cada concepto;
 * aquí solo documentamos cómo se origina el monto para guiar al operador.
 */
export type ConceptoModoCalculo =
  | 'MONTO_FIJO'
  | 'MONTO_INDIVIDUAL'
  | 'PORCENTAJE'
  | 'RESULTADO_MOTOR'
  | 'IMPORTACION';

/**
 * Banderas de visibilidad condicional del wizard (SPEC_CONCEPTOS_PLANILLA §3.A
 * "Regla UX de tabs" / §6). Una tab o campo solo se muestra si el
 * `tipoConcepto` lo requiere — sin tabs ni campos vacíos.
 *
 * Función pura: fácil de testear y libre de Angular.
 */
export interface ConceptoVisibilidad {
  /** TAB 2 — afectaciones a bases ONP/AFP. */
  readonly afectoAportePens: boolean;
  /** TAB 2 — afectación a base ESSALUD. */
  readonly afectoEssalud: boolean;
  /** TAB 2 — afectación a retención IR 5ta (oculta para APORTE_EMPLEADOR). */
  readonly afectoIr5ta: boolean;
  /** TAB 2 — banderas LEY-07 (solo conceptos que recibe el trabajador / costo entidad). */
  readonly mucCuc: boolean;
  /** TAB 2 — prorrateo por días laborados (solo ingresos). */
  readonly prorrateable: boolean;
  /** TAB 4 — código MEF/AIRHSP es obligatorio (conceptos pagables / de gasto). */
  readonly codigoMefObligatorio: boolean;
  /** TAB 4 — código tributo SUNAT relevante (retenciones: judicial / IR4ta). */
  readonly codigoTributoSunat: boolean;
}

/** Conjuntos de tipos para las reglas de visibilidad. */
const TIPOS_INGRESO: ReadonlySet<ConceptoPlanillaTipoConcepto> = new Set([
  'REMUNERATIVO',
  'NO_REMUNERATIVO',
]);

/**
 * Deriva la visibilidad de campos a partir del `tipoConcepto` (SPEC §3.A/§6).
 *
 * - REMUNERATIVO / NO_REMUNERATIVO: ingresos → afectaciones, MUC/CUC, prorrateo,
 *   MEF obligatorio (son pagables / generan gasto).
 * - DESCUENTO: retención al trabajador → IR5ta + tributo SUNAT; sin MUC/CUC ni MEF obligatorio.
 * - APORTE_TRABAJADOR: afecta bases pensionarias; sin MUC/CUC.
 * - APORTE_EMPLEADOR: costo de la entidad → ESSALUD; oculta IR5ta y MUC/CUC.
 */
export function derivarVisibilidad(
  tipoConcepto: ConceptoPlanillaTipoConcepto | null | undefined,
): ConceptoVisibilidad {
  const esIngreso = !!tipoConcepto && TIPOS_INGRESO.has(tipoConcepto);
  switch (tipoConcepto) {
    case 'REMUNERATIVO':
    case 'NO_REMUNERATIVO':
      return {
        afectoAportePens: true,
        afectoEssalud: true,
        afectoIr5ta: true,
        mucCuc: true,
        prorrateable: true,
        codigoMefObligatorio: true,
        codigoTributoSunat: false,
      };
    case 'DESCUENTO':
      return {
        afectoAportePens: false,
        afectoEssalud: false,
        afectoIr5ta: true,
        mucCuc: false,
        prorrateable: false,
        codigoMefObligatorio: false,
        codigoTributoSunat: true,
      };
    case 'APORTE_TRABAJADOR':
      return {
        afectoAportePens: true,
        afectoEssalud: false,
        afectoIr5ta: false,
        mucCuc: false,
        prorrateable: false,
        codigoMefObligatorio: false,
        codigoTributoSunat: false,
      };
    case 'APORTE_EMPLEADOR':
      return {
        afectoAportePens: false,
        afectoEssalud: true,
        afectoIr5ta: false,
        mucCuc: false,
        prorrateable: false,
        codigoMefObligatorio: false,
        codigoTributoSunat: false,
      };
    default:
      // Sin tipo definido aún: ocultar todo lo condicional salvo lo neutro.
      return {
        afectoAportePens: esIngreso,
        afectoEssalud: esIngreso,
        afectoIr5ta: false,
        mucCuc: false,
        prorrateable: esIngreso,
        codigoMefObligatorio: false,
        codigoTributoSunat: false,
      };
  }
}

/** Etiqueta legible del modo de cálculo (presentación). */
export const MODO_CALCULO_LABEL: Readonly<Record<ConceptoModoCalculo, string>> = {
  MONTO_FIJO: 'Monto fijo',
  MONTO_INDIVIDUAL: 'Monto individual (por trabajador)',
  PORCENTAJE: 'Porcentaje',
  RESULTADO_MOTOR: 'Resultado del motor',
  IMPORTACION: 'Importación',
};

/**
 * Entrada de la vista previa cualitativa del efecto en planilla (P4 — §14).
 * Solo lo necesario para derivar el texto; sin dependencias de Angular.
 */
export interface VistaPreviaEntrada {
  readonly modoCalculo: ConceptoModoCalculo;
  readonly clasificacionMotor: ConceptoPlanillaTipoConcepto | null;
  readonly afectoAportePens: boolean;
  readonly afectoEssalud: boolean;
  readonly afectoIr5ta: boolean;
  readonly prorrateable: boolean;
  readonly esMuc: boolean;
  readonly esCuc: boolean;
  /**
   * Nombres de los tipos de planilla asociados (SPEC §15 — Fase A). Resueltos
   * código → nombre antes de entrar a la función pura.
   */
  readonly planillas?: readonly string[];
}

/**
 * Vista previa del efecto en planilla (P4 — §14): explicación cualitativa,
 * derivada y read-only. NO calcula montos (la simulación numérica de neto vive
 * en el flujo de asignación al trabajador, Spec 013/C1).
 */
export interface VistaPreviaEfecto {
  /** Cómo se origina el monto (según `modoCalculo`). */
  readonly valorizacion: string;
  /** Si suma a ingresos o descuenta del neto (según clasificación del motor). */
  readonly efectoNeto: string;
  /** Bases que afecta (pensión / EsSalud / IR 5ta), prorrateo y MUC/CUC. */
  readonly afectaciones: readonly string[];
  /** Quién origina el monto: motor vs. asignación individual / archivo. */
  readonly origenMonto: string;
  /**
   * Línea "Aparece en las planillas: …" con los nombres asociados (SPEC §15).
   * Si no hay asociaciones, indica que falta seleccionar al menos una.
   */
  readonly planillas: string;
  /** Línea de cierre "En resumen: …" para lectura rápida de RR.HH. */
  readonly resumen: string;
}

const VALORIZACION_POR_MODO: Readonly<Record<ConceptoModoCalculo, string>> = {
  RESULTADO_MOTOR:
    'El monto lo calcula el motor de planilla con su lógica especializada; no se ingresa a mano.',
  MONTO_FIJO: 'Importe fijo definido para el concepto.',
  PORCENTAJE: 'Se calcula como un porcentaje sobre la base correspondiente.',
  MONTO_INDIVIDUAL: 'Se ingresa por trabajador en la asignación individual.',
  IMPORTACION: 'Se carga desde un archivo de importación.',
};

const ORIGEN_POR_MODO: Readonly<Record<ConceptoModoCalculo, string>> = {
  RESULTADO_MOTOR: 'Lo determina el motor de planilla automáticamente.',
  MONTO_FIJO: 'Toma el importe fijo registrado en el concepto.',
  PORCENTAJE: 'Aplica el porcentaje sobre la base al ejecutar el cálculo.',
  MONTO_INDIVIDUAL: 'Se asigna por trabajador al vincular el concepto.',
  IMPORTACION: 'Proviene del archivo cargado en la importación.',
};

/** Conjunto de clasificaciones que descuentan del neto del trabajador. */
const CLASIF_DESCUENTA: ReadonlySet<ConceptoPlanillaTipoConcepto> = new Set([
  'DESCUENTO',
  'APORTE_TRABAJADOR',
]);

/**
 * Deriva la vista previa cualitativa del efecto en planilla (P4 — §14).
 *
 * Función PURA y testeable: a partir del modo de cálculo + clasificación del
 * motor + afectaciones, explica en lenguaje de RR.HH. cómo se comportará el
 * concepto. No realiza ningún cálculo numérico.
 */
export function derivarVistaPrevia(e: VistaPreviaEntrada): VistaPreviaEfecto {
  const valorizacion = VALORIZACION_POR_MODO[e.modoCalculo];
  const origenMonto = ORIGEN_POR_MODO[e.modoCalculo];

  let efectoNeto: string;
  switch (e.clasificacionMotor) {
    case 'REMUNERATIVO':
    case 'NO_REMUNERATIVO':
      efectoNeto = 'Suma a los ingresos del trabajador.';
      break;
    case 'DESCUENTO':
      efectoNeto = 'Descuenta del neto del trabajador.';
      break;
    case 'APORTE_TRABAJADOR':
      efectoNeto = 'Es un aporte del trabajador: descuenta de su neto.';
      break;
    case 'APORTE_EMPLEADOR':
      efectoNeto =
        'Es costo de la entidad (aporte del empleador): no descuenta al trabajador.';
      break;
    default:
      efectoNeto = 'Defina el Tipo de Concepto para determinar su efecto en el neto.';
  }

  const afectaciones: string[] = [];
  if (e.afectoAportePens) {
    afectaciones.push('Integra la base de pensión (ONP / AFP).');
  }
  if (e.afectoEssalud) {
    afectaciones.push('Integra la base de EsSalud.');
  }
  if (e.afectoIr5ta) {
    afectaciones.push('Integra la base de retención de IR 5ta categoría.');
  }
  if (e.prorrateable) {
    afectaciones.push('Se prorratea por los días laborados en el período.');
  }
  if (e.esMuc) {
    afectaciones.push('MUC: lo recibe el trabajador (va a su boleta — LEY-07).');
  }
  if (e.esCuc) {
    afectaciones.push('CUC: representa el costo para la entidad (LEY-07).');
  }
  if (afectaciones.length === 0) {
    afectaciones.push('No afecta otras bases ni se prorratea.');
  }

  const planillas = construirLineaPlanillas(e.planillas);
  const resumen = construirResumen(e, efectoNeto);

  return { valorizacion, efectoNeto, afectaciones, origenMonto, planillas, resumen };
}

/** Línea "Aparece en las planillas: …" (SPEC §15 — Fase A). Función pura. */
function construirLineaPlanillas(planillas: readonly string[] | undefined): string {
  const nombres = (planillas ?? []).filter((n) => n.trim().length > 0);
  if (nombres.length === 0) {
    return 'Seleccione al menos un tipo de planilla en el paso Aplicabilidad.';
  }
  return `Aparece en las planillas: ${nombres.join(', ')}.`;
}

/** Línea de cierre "En resumen: …" derivada del efecto y afectaciones. */
function construirResumen(e: VistaPreviaEntrada, efectoNeto: string): string {
  if (!e.clasificacionMotor) {
    return 'En resumen: seleccione el Tipo de Concepto para ver cómo afectará la planilla.';
  }

  const descuenta = CLASIF_DESCUENTA.has(e.clasificacionMotor);
  const accion = descuenta
    ? 'reducirá el neto del trabajador'
    : e.clasificacionMotor === 'APORTE_EMPLEADOR'
      ? 'será costo de la entidad sin afectar el neto'
      : 'sumará a los ingresos del trabajador';

  const bases: string[] = [];
  if (e.afectoAportePens) bases.push('pensión');
  if (e.afectoEssalud) bases.push('EsSalud');
  if (e.afectoIr5ta) bases.push('IR 5ta');

  const valorizado =
    e.modoCalculo === 'RESULTADO_MOTOR'
      ? 'lo valoriza el motor'
      : e.modoCalculo === 'MONTO_INDIVIDUAL'
        ? 'se asigna por trabajador'
        : `se valoriza por ${MODO_CALCULO_LABEL[e.modoCalculo].toLowerCase()}`;

  const colaBases = bases.length
    ? ` y afectará las bases de ${bases.join(', ')}`
    : '';

  return `En resumen: este concepto ${accion}, ${valorizado}${colaBases}.`;
}

/**
 * Tipo legacy `tipo` (INGRESO/DESCUENTO) derivado del `tipoConcepto` MEF.
 * Conserva compat con la UI Spec 009 (TAB 1, auto-derivado).
 */
export function derivarTipoLegacy(
  tipoConcepto: ConceptoPlanillaTipoConcepto | null | undefined,
): ConceptoPlanillaTipo {
  switch (tipoConcepto) {
    case 'DESCUENTO':
    case 'APORTE_TRABAJADOR':
      return 'DESCUENTO';
    default:
      return 'INGRESO';
  }
}
