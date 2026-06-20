import type {
  SubsidioEstadoCaso,
  SubsidioLiquidacionExplicacion,
  SubsidioCalculoPaso,
  SubsidioSeveridad,
  SubsidioTipoCaso,
} from '../models/subsidio.models';

const SOLES = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea montos en soles peruanos para tablas de cálculo. */
export function formatSubsidioMonto(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return '—';
  return SOLES.format(valor);
}

/** Formatea fecha ISO (yyyy-MM-dd) a dd/MM/yyyy para pantallas operativas. */
export function formatFechaSubsidio(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const parts = fecha.split('-');
  if (parts.length !== 3) return fecha;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Etiqueta legible de período AAAAMM → "Mes AAAA". */
export function formatPeriodoPlanillaLabel(periodo: string): string {
  if (!periodo || periodo === '—' || periodo.length !== 6) return periodo || '—';
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const mes = Number.parseInt(periodo.slice(4, 6), 10);
  const anio = periodo.slice(0, 4);
  if (mes < 1 || mes > 12) return periodo;
  return `${meses[mes - 1]} ${anio}`;
}

/** Ícono Material sugerido según tipo de subsidio. */
export function iconoTipoCaso(tipo: SubsidioTipoCaso | string | null): string {
  return tipo === 'MATERNIDAD' ? 'pregnant_woman' : 'medical_services';
}

/** Etiqueta legible del tipo de caso. */
export function labelTipoCaso(tipo: SubsidioTipoCaso | string | null): string {
  if (tipo === 'ENFERMEDAD') return 'Enfermedad / incapacidad temporal';
  if (tipo === 'MATERNIDAD') return 'Maternidad';
  return tipo ?? '—';
}

/** Etiqueta legible del estado del caso. */
export function labelEstadoCaso(estado: SubsidioEstadoCaso | string | null): string {
  const mapa: Record<string, string> = {
    BORRADOR: 'Borrador',
    PENDIENTE_VALIDACION: 'Pendiente de validación',
    CALCULADO: 'Calculado',
    APLICADO_PLANILLA: 'Aplicado a planilla',
    EN_TRAMITE_ESSALUD: 'En trámite EsSalud',
    CERRADO: 'Cerrado',
  };
  return estado ? (mapa[estado] ?? estado) : '—';
}

/** Variante visual del badge de estado. */
export function estadoCasoVariant(
  estado: SubsidioEstadoCaso | string | null,
): 'neutral' | 'warning' | 'success' | 'info' | 'danger' {
  switch (estado) {
    case 'BORRADOR':
      return 'neutral';
    case 'PENDIENTE_VALIDACION':
      return 'warning';
    case 'CALCULADO':
      return 'info';
    case 'APLICADO_PLANILLA':
    case 'CERRADO':
      return 'success';
    case 'EN_TRAMITE_ESSALUD':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** Etiqueta legible de severidad de validación. */
export function labelSeveridadValidacion(
  severidad: SubsidioSeveridad | string,
): string {
  switch (severidad) {
    case 'BLOQUEO':
      return 'Bloqueo';
    case 'ALERTA':
      return 'Alerta';
    case 'INFORMATIVA':
      return 'Informativa';
    default:
      return severidad ?? '—';
  }
}

/** Etiqueta legible del estado de un tramo mensual. */
export function labelEstadoTramo(estado: string | null | undefined): string {
  const mapa: Record<string, string> = {
    BORRADOR: 'Borrador',
    CALCULADO: 'Calculado',
    APLICADO: 'Aplicado',
    CERRADO: 'Cerrado',
    PENDIENTE: 'Pendiente',
  };
  return estado ? (mapa[estado] ?? estado) : '—';
}

/** Etiqueta legible del estado de liquidación. */
export function labelEstadoLiquidacion(estado: string | null | undefined): string {
  const mapa: Record<string, string> = {
    BORRADOR: 'Borrador',
    CALCULADO: 'Calculado',
    APLICADO_PLANILLA: 'Aplicado a planilla',
    REVERTIDO: 'Revertido',
    ANULADO: 'Anulado',
  };
  return estado ? (mapa[estado] ?? estado) : '—';
}

/** Variante visual de severidad de validación. */
export function severidadVariant(
  severidad: SubsidioSeveridad | string,
): 'danger' | 'warning' | 'info' {
  switch (severidad) {
    case 'BLOQUEO':
      return 'danger';
    case 'ALERTA':
      return 'warning';
    default:
      return 'info';
  }
}

/** Construye pasos explicativos del cálculo para la pestaña Cálculo. */
export function buildPasosCalculo(
  exp: SubsidioLiquidacionExplicacion,
): readonly SubsidioCalculoPaso[] {
  return [
    {
      orden: 1,
      concepto: 'Contraprestación diaria',
      formula: 'Base reconocida ÷ divisor promedio',
      valor: formatSubsidioMonto(exp.contraprestacionDiaria),
    },
    {
      orden: 2,
      concepto: 'Contraprestación equivalente del tramo',
      formula: `Contraprestación diaria × días del tramo (${exp.diasSubsidio} subsidio + ${exp.diasLaborados} laborados)`,
      valor: formatSubsidioMonto(exp.contraprestacionEquivalente),
    },
    {
      orden: 3,
      concepto: 'Subsidio diario EsSalud',
      formula: 'Según regla vigente y tope BIM',
      valor: formatSubsidioMonto(exp.subsidioDiarioEssalud),
    },
    {
      orden: 4,
      concepto: 'Subsidio estimado EsSalud',
      formula: `Subsidio diario × ${exp.diasSubsidio} días`,
      valor: formatSubsidioMonto(exp.subsidioEstimado),
    },
    {
      orden: 5,
      concepto: 'Diferencial INDECI (concepto 2073)',
      formula: 'Subsidio total 100% − subsidio EsSalud',
      valor: formatSubsidioMonto(exp.diferencialIndeci),
    },
    {
      orden: 6,
      concepto: 'Conciliación total',
      formula: 'Debe igualar la contraprestación equivalente del tramo',
      valor: formatSubsidioMonto(exp.conciliacionTotal),
    },
  ];
}

/** Verifica si el usuario tiene un permiso SUB_* en JWT. */
export function tienePermisoSubsidio(
  permisos: ReadonlyArray<string>,
  codigo: string,
): boolean {
  return permisos.includes(codigo) || permisos.includes('SUPER_ADMIN');
}
