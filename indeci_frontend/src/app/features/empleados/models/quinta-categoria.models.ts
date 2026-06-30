export interface EmpleadoOtrosIngresosDto {
  id?: number;
  empleadoId: number;
  anioFiscal: number;
  montoIngresos: number;
  montoRetenciones: number;
}

export interface LiquidacionQuintaDto {
  idEmpleado: string;
  nombreCompleto: string;
  periodoCalculo: string;
  
  // Bloque 1 (RBA)
  sueldoMensualProyectado: number;
  gratificacionesProyectadas: number;
  remuneracionesPercibidasAnteriores: number;
  ingresosOtrosEmpleadores: number;
  totalRentaBrutaAnual: number;
  
  // Bloque 2 (Deducción)
  montoDeduccionUIT: number;
  totalRentaNetaImponible: number;
  
  // Bloque 3 (Tramos)
  tramo1: number;
  tramo2: number;
  tramo3: number;
  tramo4: number;
  tramo5: number;
  impuestoAnualProyectado: number;
  
  // Bloque 4 (Prorrateo)
  retencionesAcumuladasExternas: number;
  saldoRetenerAnual: number;
  divisorMes: number;
  montoRetenerMes: number;
}
