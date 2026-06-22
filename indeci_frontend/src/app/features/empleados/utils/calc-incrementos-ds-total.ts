/**
 * Total incrementos DS derivado en UI (no persistido).
 * Si `montoContrato` es null (legacy), retorna null → mostrar "—".
 */
export function calcIncrementosDsTotal(
  sueldoBasico: number | null | undefined,
  montoContrato: number | null | undefined,
): number | null {
  if (montoContrato == null || sueldoBasico == null) {
    return null;
  }
  const diff = roundMoney(sueldoBasico - montoContrato);
  return diff > 0 ? diff : 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
