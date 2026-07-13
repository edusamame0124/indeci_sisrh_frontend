import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  DetalleVacacionRequest,
  PeriodoProgramado,
  SaldoProporcional,
  SaldoVacacional,
  SolicitudesRrhhService,
  TipoSolicitudRrhh,
  TipoVacacion,
} from '../../services/solicitudes-rrhh';

interface DetalleVacacionForm {
  tipo: string;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  totalDias: number | null;
  /** Hub Vacacional — id del período origen elegido del dropdown (solo detalles "_ACTUAL"). */
  vacacionOrigenId?: number | null;
  /** Art. 34 D.S. 013-2019-PCM — true si el +2 del fin de semana (viernes) se aplicó a este período. */
  reglaViernesArt34?: boolean;
  /** Art. 35 — fracción solicitada como media jornada (0.5 día hábil). Solo aplica a FRACC_n de 1 día. */
  mediaJornada?: boolean;
}

interface VacacionesDialogData {
  tipoSolicitud: TipoSolicitudRrhh;
  tipoVacacionCodigo?: string;
  tipoVacacionNombre?: string;
}

@Component({
  selector: 'app-vacaciones-dialog',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './vacaciones-dialog.html',
  styleUrl: './vacaciones-dialog.scss',
})
export class VacacionesDialog implements OnInit {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<VacacionesDialog>);

  // Art. 34 D.S. 013-2019-PCM.
  private readonly DIA_VIERNES = 5; // Date.getDay(): 0=Dom … 5=Vie
  private readonly DIAS_ART34_FIN_SEMANA = 2;
  private readonly MAX_DIAS_LEGAL = 30;

  // Art. 35 D.S. 013-2019-PCM (fraccionamiento en días HÁBILES por período).
  private readonly POOL_DIAS_HABILES = 7; // bolsa por período (regla b)
  private readonly MAX_HABILES_SEMANA = 4; // tope por semana (regla c)
  /** Feriados (ISO yyyy-MM-dd) para excluirlos del cómputo de días hábiles, igual que el backend. */
  readonly feriados = signal<Set<string>>(new Set());

  tiposVacacion = signal<TipoVacacion[]>([]);
  cargandoTipos = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);

  // Adelanto de Vacaciones (Art. 10 D.S. 013-2019-PCM): tope proporcional (meses × 2.5).
  saldoProporcional = signal<SaldoProporcional | null>(null);
  cargandoProporcional = signal(false);

  // Saldo general (Obtenidos/Gozados/Saldo) — visible SIEMPRE, en cualquier tipo de papeleta
  // (Programación/Adelanto/Fraccionamiento), a pedido de RR.HH.
  saldoVacacional = signal<SaldoVacacional | null>(null);
  cargandoSaldo = signal(false);

  // Hub Vacacional — Poka-Yoke: periodos ya aprobados disponibles para reprogramar/fraccionar
  // (dropdown, reemplaza el ingreso manual de fechas en REPROG_ACTUAL/FRACC_ACTUAL).
  periodosProgramados = signal<PeriodoProgramado[]>([]);
  cargandoPeriodos = signal(false);

  tituloDialog = 'Solicitud de vacaciones';

  tipoVacacionId: number | null = null;
  detallesVacacion: DetalleVacacionForm[] = [];

  motivo = '';
  observacion = '';
  archivoSustento: File | null = null;

  tipoSolicitud!: TipoSolicitudRrhh;
  tipoVacacionCodigoInicial: string | null = null;
  tipoVacacionNombre: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: TipoSolicitudRrhh | VacacionesDialogData,
  ) {
    if ('tipoSolicitud' in data) {
      this.tipoSolicitud = data.tipoSolicitud;
      this.tipoVacacionCodigoInicial = data.tipoVacacionCodigo ?? null;
      this.tipoVacacionNombre = data.tipoVacacionNombre ?? null;
    } else {
      this.tipoSolicitud = data;
    }

    this.tituloDialog = this.tipoSolicitud?.nombre ?? 'Solicitud de vacaciones';
  }

  ngOnInit(): void {
    this.cargarTiposVacacion();
    this.cargarSaldoVacacional();
    this.cargarFeriados();
  }

  /** Carga los feriados del año actual y el siguiente (cubre rangos de fracciones a fin de año). */
  private cargarFeriados(): void {
    const anio = new Date().getFullYear();
    const set = new Set<string>();
    for (const a of [anio, anio + 1]) {
      this.service.obtenerFeriados(a).subscribe({
        next: (resp) => {
          (resp.data ?? []).forEach((f) => set.add(f));
          this.feriados.set(new Set(set));
          // Recalcular fracciones ya ingresadas ahora que conocemos los feriados.
          this.detallesVacacion
            .filter((d) => this.esFraccionNueva(d.tipo))
            .forEach((d) => this.calcularDias(d));
        },
        error: () => {
          /* si falla, la UI excluye solo fines de semana; el backend valida feriados igual */
        },
      });
    }
  }

  /** Obtenidos/Gozados/Saldo — SIEMPRE visible, independiente del tipo elegido (pedido RR.HH.). */
  private cargarSaldoVacacional(): void {
    this.cargandoSaldo.set(true);
    this.service.obtenerMiSaldo().subscribe({
      next: (resp) => {
        this.saldoVacacional.set(resp?.data ?? null);
        this.cargandoSaldo.set(false);
      },
      error: () => {
        this.saldoVacacional.set(null);
        this.cargandoSaldo.set(false);
      },
    });
  }

  cargarTiposVacacion(): void {
    this.cargandoTipos.set(true);

    this.service.listarTiposVacacion().subscribe({
      next: (resp) => {
        const activos = (resp.data ?? []).filter((x) => Number(x.activo ?? 1) === 1);
        this.tiposVacacion.set(activos);
        this.cargandoTipos.set(false);

        this.seleccionarTipoVacacionInicial();
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo de tipos de vacación.');
        this.cargandoTipos.set(false);
      },
    });
  }

  normalizarTexto(valor: string | number | null | undefined): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  private codigoDesdeValor(valor: string | number | null | undefined): string {
    const texto = this.normalizarTexto(valor);

    if (!texto) {
      return '';
    }

    const soloNumeros = texto.replace(/\D/g, '');

    if (soloNumeros && soloNumeros.length <= 3) {
      return soloNumeros.padStart(3, '0');
    }

    // IMPORTANTE:
    // REPROGRAMACION contiene PROGRAMACION.
    // Por eso REPROGRAM debe evaluarse antes que PROGRAM.
    if (texto.includes('REPROGRAM')) return '003';
    if (texto.includes('FRACCION')) return '004';
    if (texto.includes('ADELANTO')) return '002';
    if (texto.includes('PROGRAM')) return '001';

    return '';
  }

  private codigoDesdeTipoVacacion(tipo: TipoVacacion | null | undefined): string {
    if (!tipo) {
      return '';
    }

    const codigoPorCampo = this.codigoDesdeValor(tipo.codigo);

    if (codigoPorCampo) {
      return codigoPorCampo;
    }

    return this.codigoDesdeValor(tipo.nombre);
  }

  private codigoInicialSolicitado(): string {
    const codigoPorMenu = this.codigoDesdeValor(this.tipoVacacionCodigoInicial);

    if (codigoPorMenu) {
      return codigoPorMenu;
    }

    return this.codigoDesdeValor(this.tipoVacacionNombre);
  }

  tipoVacacionSeleccionado(): TipoVacacion | null {
    return this.tiposVacacion().find((x) => Number(x.id) === Number(this.tipoVacacionId)) ?? null;
  }

  tipoVacacionSeleccionadoNombre(): string {
    return this.tipoVacacionSeleccionado()?.nombre ?? this.tipoVacacionNombre ?? '-';
  }

  nombreTipoVacacionSeleccionado(): string {
    return this.tipoVacacionSeleccionado()?.nombre ?? this.tipoVacacionNombre ?? '-';
  }
  codigoTipoSolicitud(): string {
    return String(this.tipoSolicitud?.codigo ?? '').padStart(3, '0');
  }

  requiereMotivo(): boolean {
    const codigosQueRequierenMotivo = ['007'];

    return codigosQueRequierenMotivo.includes(this.codigoTipoSolicitud());
  }
  seleccionarTipoVacacionInicial(): void {
    if (!this.tipoVacacionCodigoInicial && !this.tipoVacacionNombre) {
      return;
    }

    const codigoEsperado = this.codigoInicialSolicitado();
    const nombreEsperado = this.normalizarTexto(this.tipoVacacionNombre);

    let tipo: TipoVacacion | undefined;

    if (codigoEsperado) {
      tipo = this.tiposVacacion().find((x) => this.codigoDesdeTipoVacacion(x) === codigoEsperado);
    }

    if (!tipo && nombreEsperado) {
      tipo = this.tiposVacacion().find((x) => this.normalizarTexto(x.nombre) === nombreEsperado);
    }

    if (!tipo && nombreEsperado) {
      tipo = this.tiposVacacion().find((x) => {
        const nombre = this.normalizarTexto(x.nombre);

        // Solo comparamos en una dirección para evitar que
        // REPROGRAMACION coincida con PROGRAMACION.
        return nombre.includes(nombreEsperado);
      });
    }

    if (!tipo) {
      const solicitado = this.tipoVacacionNombre ?? this.tipoVacacionCodigoInicial ?? '-';
      this.error.set(`No se encontró el tipo de vacación: ${solicitado}.`);
      return;
    }

    this.tipoVacacionId = Number(tipo.id);
    this.tituloDialog = `${this.tipoSolicitud.nombre} - ${tipo.nombre}`;

    this.onTipoVacacionChange();
  }

  codigoTipoVacacion(): string {
    return this.codigoDesdeTipoVacacion(this.tipoVacacionSeleccionado());
  }

  requiereSustento(): boolean {
    return Number(this.tipoSolicitud?.requiereSustento ?? 0) === 1;
  }

  requiereObservacion(): boolean {
    return Number(this.tipoSolicitud?.requiereObservacion ?? 0) === 1;
  }

  onTipoVacacionChange(): void {
    this.error.set(null);
    this.detallesVacacion = [];
    this.saldoProporcional.set(null);

    const codigo = this.codigoTipoVacacion();

    if (codigo === '001') {
      this.detallesVacacion.push({
        tipo: 'PROGRAMACION',
        titulo: 'Periodo de programación',
        fechaInicio: '',
        fechaFin: '',
        totalDias: null,
      });
    }

    if (codigo === '002') {
      this.detallesVacacion.push({
        tipo: 'ADELANTO',
        titulo: 'Periodo de adelanto',
        fechaInicio: '',
        fechaFin: '',
        totalDias: null,
      });
      this.cargarSaldoProporcional();
    }

    if (codigo === '003') {
      this.detallesVacacion.push(
        {
          tipo: 'REPROG_ACTUAL',
          titulo: 'Periodo actual',
          fechaInicio: '',
          fechaFin: '',
          totalDias: null,
          vacacionOrigenId: null,
        },
        {
          tipo: 'REPROG_NUEVO',
          titulo: 'Nuevo periodo 1',
          fechaInicio: '',
          fechaFin: '',
          totalDias: null,
        },
      );
      this.cargarPeriodosProgramados();
    }

    if (codigo === '004') {
      // Art. 35 — el fraccionamiento se solicita DIRECTAMENTE sobre el saldo disponible:
      // el empleado define sus fracciones; NO requiere un período previamente aprobado
      // (eso es Reprogramación). Por eso no hay "Periodo origen" ni dropdown aquí.
      this.detallesVacacion.push({
        tipo: 'FRACC_1',
        titulo: 'Fracción 1',
        fechaInicio: '',
        fechaFin: '',
        totalDias: null,
      });
    }
  }

  /**
   * Art. 34 D.S. 013-2019-PCM — días calendario del período:
   *   base = (Hasta − Desde) + 1;  si INICIA o CONCLUYE en viernes ⇒ +2 (sábado y domingo
   *   inmediatos se computan). El operador OR evita la duplicidad del +4 cuando ambos
   *   extremos caen en viernes (incluido el mismo viernes de 1 día). El usuario NUNCA digita
   *   este valor (campo `disabled`); solo edita las fechas.
   */
  calcularDias(detalle: DetalleVacacionForm): void {
    detalle.reglaViernesArt34 = false;

    // Art. 35 — las fracciones (FRACC_n) se miden en días HÁBILES (no calendario) y NO aplican
    // el +2 del Art. 34. La media jornada (0.5) solo vale si es un único día (Desde == Hasta).
    if (this.esFraccionNueva(detalle.tipo)) {
      if (!detalle.fechaInicio || !detalle.fechaFin) {
        detalle.totalDias = null;
        return;
      }
      if (this.aDate(detalle.fechaFin) < this.aDate(detalle.fechaInicio)) {
        detalle.totalDias = null;
        this.error.set('La fecha fin no puede ser menor que la fecha inicio.');
        return;
      }
      // Media jornada: SOLO válida sobre un único día HÁBIL (no sábado/domingo).
      const unicoDiaHabil =
        detalle.fechaInicio === detalle.fechaFin && this.esHabilIso(detalle.fechaInicio);
      if (detalle.mediaJornada && unicoDiaHabil) {
        detalle.totalDias = 0.5;
        this.error.set(null);
        return;
      }
      detalle.mediaJornada = false;
      const habiles = this.diasHabilesEntre(detalle.fechaInicio, detalle.fechaFin);
      if (habiles <= 0) {
        detalle.totalDias = null;
        this.error.set(
          'El período seleccionado no tiene días hábiles (sábados, domingos y feriados no se computan).',
        );
        return;
      }
      detalle.totalDias = habiles;
      this.error.set(null);
      return;
    }

    if (!detalle.fechaInicio || !detalle.fechaFin) {
      detalle.totalDias = null;
      return;
    }

    // 'T00:00:00' fuerza hora LOCAL (Perú UTC-5, sin DST) → getDay() sin corrimiento de zona.
    const inicio = new Date(`${detalle.fechaInicio}T00:00:00`);
    const fin = new Date(`${detalle.fechaFin}T00:00:00`);

    const diasBase = Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (diasBase <= 0) {
      detalle.totalDias = null;
      this.error.set('La fecha fin no puede ser menor que la fecha inicio.');
      return;
    }

    const aplicaViernes =
      inicio.getDay() === this.DIA_VIERNES || fin.getDay() === this.DIA_VIERNES;
    detalle.reglaViernesArt34 = aplicaViernes;
    detalle.totalDias = diasBase + (aplicaViernes ? this.DIAS_ART34_FIN_SEMANA : 0);

    if (detalle.totalDias > this.MAX_DIAS_LEGAL) {
      this.error.set(
        `El periodo "${detalle.titulo}" suma ${detalle.totalDias} días y supera el máximo legal ` +
          `de ${this.MAX_DIAS_LEGAL} días calendario (Art. 34). Ajuste las fechas.`,
      );
      return;
    }

    this.error.set(null);
  }

  /** true si algún período supera el máximo legal de 30 días (Art. 34) — bloquea Guardar. */
  excedeMaximoLegal(): boolean {
    return this.detallesVacacion.some((d) => (d.totalDias ?? 0) > this.MAX_DIAS_LEGAL);
  }

  // ── Adelanto de Vacaciones: tope proporcional (Art. 10 D.S. 013-2019-PCM) ──

  esAdelanto(): boolean {
    return this.codigoTipoVacacion() === '002';
  }

  // ── Programación: bloqueo temprano por saldo (Opción 1) + sugerir Adelanto (Opción 2, UI) ──

  esProgramacion(): boolean {
    return this.codigoTipoVacacion() === '001';
  }

  /** Días de programación solicitados (suma de detalles PROGRAMACION). */
  diasProgramacionSolicitados(): number {
    return this.detallesVacacion
      .filter((d) => d.tipo === 'PROGRAMACION')
      .reduce((acc, d) => acc + (d.totalDias ?? 0), 0);
  }

  /** Saldo vacacional disponible (Obtenidos − Gozados); null si aún no se cargó. */
  saldoDisponible(): number | null {
    return this.saldoVacacional()?.saldo ?? null;
  }

  /**
   * true si la Programación solicitada supera el saldo YA ganado (bloquea Guardar). La
   * Programación solo dispone de días efectivos; sin saldo, la vía es el Adelanto.
   */
  excedeProgramacion(): boolean {
    const saldo = this.saldoDisponible();
    if (!this.esProgramacion() || saldo == null) {
      return false;
    }
    return this.diasProgramacionSolicitados() > saldo;
  }

  /** Días de adelanto que el usuario está solicitando (suma de detalles ADELANTO). */
  diasAdelantoSolicitados(): number {
    return this.detallesVacacion
      .filter((d) => d.tipo === 'ADELANTO')
      .reduce((acc, d) => acc + (d.totalDias ?? 0), 0);
  }

  /** true si el adelanto solicitado supera el saldo proporcional disponible (bloquea Guardar). */
  excedeAdelanto(): boolean {
    const saldo = this.saldoProporcional();
    if (!this.esAdelanto() || !saldo) {
      return false;
    }
    return this.diasAdelantoSolicitados() > saldo.saldoDisponible;
  }

  // ── Art. 35: fraccionamiento en días hábiles + media jornada (Poka-Yoke) ──

  esFraccionamiento(): boolean {
    return this.codigoTipoVacacion() === '004';
  }

  private aDate(iso: string): Date {
    return new Date(`${iso}T00:00:00`);
  }

  private esFinDeSemana(d: Date): boolean {
    const g = d.getDay();
    return g === 0 || g === 6; // Dom o Sáb
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  }

  /** ¿La fecha ISO es día hábil? (no fin de semana ni feriado — igual que el backend). */
  private esHabilIso(iso: string): boolean {
    return !this.esFinDeSemana(this.aDate(iso)) && !this.feriados().has(iso);
  }

  /** Días HÁBILES del rango (excluye fines de semana y feriados). */
  private diasHabilesEntre(desde: string, hasta: string): number {
    const fin = this.aDate(hasta);
    let count = 0;
    for (const d = this.aDate(desde); d <= fin; d.setDate(d.getDate() + 1)) {
      if (!this.esFinDeSemana(d) && !this.feriados().has(this.toIso(d))) count++;
    }
    return count;
  }

  /** Lunes (ISO) de la semana de una fecha — clave para agrupar la regla c). */
  private lunesDeSemana(d: Date): string {
    const c = new Date(d);
    const g = c.getDay() || 7; // Dom=7
    c.setDate(c.getDate() - g + 1);
    return c.toISOString().slice(0, 10);
  }

  /** Muestra el toggle de media jornada solo si la fracción es de un único día (Desde == Hasta). */
  mostrarToggleMediaJornada(detalle: DetalleVacacionForm): boolean {
    return (
      this.esFraccionNueva(detalle.tipo) &&
      !!detalle.fechaInicio &&
      detalle.fechaInicio === detalle.fechaFin &&
      this.esHabilIso(detalle.fechaInicio) // solo si el único día es hábil (no fin de semana)
    );
  }

  onMediaJornadaChange(detalle: DetalleVacacionForm): void {
    this.calcularDias(detalle);
  }

  /** Días CALENDARIO de una fracción (para el aviso a): 1–6 días consume la bolsa de hábiles). */
  diasCalendarioFraccion(detalle: DetalleVacacionForm): number {
    if (!detalle.fechaInicio || !detalle.fechaFin) return 0;
    const ini = this.aDate(detalle.fechaInicio);
    const fin = this.aDate(detalle.fechaFin);
    return Math.floor((fin.getTime() - ini.getTime()) / 86_400_000) + 1;
  }

  /** ⚠ regla a): la fracción es < 7 días calendario → consume la bolsa de días hábiles. */
  avisoConsumeBolsa(detalle: DetalleVacacionForm): boolean {
    const cal = this.diasCalendarioFraccion(detalle);
    return this.esFraccionNueva(detalle.tipo) && cal >= 1 && cal < 7;
  }

  /** Tracker: días hábiles fraccionados solicitados (suma de FRACC_n). */
  diasHabilesFraccionados(): number {
    return this.detallesVacacion
      .filter((d) => this.esFraccionNueva(d.tipo))
      .reduce((acc, d) => acc + (d.totalDias ?? 0), 0);
  }

  get poolDiasHabiles(): number {
    return this.POOL_DIAS_HABILES;
  }

  /** ❌ regla b): superó los 7 días hábiles fraccionables del período. */
  excedeBolsaHabiles(): boolean {
    return this.diasHabilesFraccionados() > this.POOL_DIAS_HABILES;
  }

  /** ❌ regla c): más de 4 días hábiles fraccionados en una misma semana. */
  excedeSemana(): boolean {
    const porSemana = new Map<string, number>();
    for (const f of this.detallesVacacion.filter((d) => this.esFraccionNueva(d.tipo))) {
      if (!f.fechaInicio || !f.fechaFin) continue;
      if (f.mediaJornada && f.fechaInicio === f.fechaFin) {
        const k = this.lunesDeSemana(this.aDate(f.fechaInicio));
        porSemana.set(k, (porSemana.get(k) ?? 0) + 0.5);
        continue;
      }
      const fin = this.aDate(f.fechaFin);
      for (const d = this.aDate(f.fechaInicio); d <= fin; d.setDate(d.getDate() + 1)) {
        if (this.esFinDeSemana(d) || this.feriados().has(this.toIso(d))) continue;
        const k = this.lunesDeSemana(d);
        porSemana.set(k, (porSemana.get(k) ?? 0) + 1);
      }
    }
    return Array.from(porSemana.values()).some((v) => v > this.MAX_HABILES_SEMANA);
  }

  /** true si hay una infracción ❌ de fraccionamiento (bloquea Guardar). */
  excedeFraccionamiento(): boolean {
    return this.esFraccionamiento() && (this.excedeBolsaHabiles() || this.excedeSemana());
  }

  // ── Hub Vacacional: dropdown Poka-Yoke (periodo origen, no texto libre) ──

  esDetalleActual(tipo: string): boolean {
    return tipo === 'REPROG_ACTUAL' || tipo === 'FRACC_ACTUAL';
  }

  private cargarPeriodosProgramados(): void {
    this.cargandoPeriodos.set(true);
    this.service.obtenerPeriodosProgramados().subscribe({
      next: (resp) => {
        this.periodosProgramados.set(resp?.data ?? []);
        this.cargandoPeriodos.set(false);
      },
      error: () => {
        this.periodosProgramados.set([]);
        this.cargandoPeriodos.set(false);
      },
    });
  }

  /** Al elegir un período del dropdown: autocompleta fechas/días y guarda el id origen. */
  seleccionarPeriodoOrigen(detalle: DetalleVacacionForm, periodoId: string | number | null): void {
    const id = periodoId != null ? Number(periodoId) : null;
    const periodo = this.periodosProgramados().find((p) => p.id === id) ?? null;

    detalle.vacacionOrigenId = periodo?.id ?? null;
    detalle.fechaInicio = periodo?.periodoDesde ?? '';
    detalle.fechaFin = periodo?.periodoHasta ?? '';
    detalle.totalDias = periodo?.dias ?? null;
    this.error.set(null);
  }

  private cargarSaldoProporcional(): void {
    this.cargandoProporcional.set(true);
    this.saldoProporcional.set(null);

    this.service.obtenerMiSaldoProporcional().subscribe({
      next: (resp) => {
        this.saldoProporcional.set(resp?.data ?? null);
        this.cargandoProporcional.set(false);
      },
      error: () => {
        // No bloqueamos la UI si el preview falla; el candado del backend igual protege.
        this.saldoProporcional.set(null);
        this.cargandoProporcional.set(false);
      },
    });
  }

  puedeAgregarReprogramacion(): boolean {
    const codigo = this.codigoTipoVacacion();
    const nuevos = this.detallesVacacion.filter((x) => x.tipo === 'REPROG_NUEVO').length;

    return codigo === '003' && nuevos < 2;
  }

  agregarReprogramacion(): void {
    if (!this.puedeAgregarReprogramacion()) return;

    const numero = this.detallesVacacion.filter((x) => x.tipo === 'REPROG_NUEVO').length + 1;

    this.detallesVacacion.push({
      tipo: 'REPROG_NUEVO',
      titulo: `Nuevo periodo ${numero}`,
      fechaInicio: '',
      fechaFin: '',
      totalDias: null,
    });
  }

  esFraccionNueva(tipo: string): boolean {
    return /^FRACC_\d+$/.test(tipo);
  }

  puedeAgregarFraccion(): boolean {
    const codigo = this.codigoTipoVacacion();
    const fracciones = this.detallesVacacion.filter((x) => this.esFraccionNueva(x.tipo)).length;

    return codigo === '004' && fracciones < 4;
  }

  agregarFraccion(): void {
    if (!this.puedeAgregarFraccion()) return;

    const numero = this.detallesVacacion.filter((x) => this.esFraccionNueva(x.tipo)).length + 1;

    this.detallesVacacion.push({
      tipo: `FRACC_${numero}`,
      titulo: `Fracción ${numero}`,
      fechaInicio: '',
      fechaFin: '',
      totalDias: null,
    });
  }

  quitarUltimoDetalle(): void {
    const ultimo = this.detallesVacacion[this.detallesVacacion.length - 1];

    if (!ultimo) return;

    if (ultimo.tipo === 'REPROG_NUEVO') {
      const nuevos = this.detallesVacacion.filter((x) => x.tipo === 'REPROG_NUEVO').length;

      if (nuevos > 1) {
        this.detallesVacacion.pop();
      }

      return;
    }

    if (this.esFraccionNueva(ultimo.tipo)) {
      const fracciones = this.detallesVacacion.filter((x) => this.esFraccionNueva(x.tipo)).length;

      if (fracciones > 1) {
        this.detallesVacacion.pop();
      }
    }
  }

  detallePrincipal(): DetalleVacacionForm | null {
    const codigo = this.codigoTipoVacacion();

    if (codigo === '001') {
      return this.detallesVacacion.find((x) => x.tipo === 'PROGRAMACION') ?? null;
    }

    if (codigo === '002') {
      return this.detallesVacacion.find((x) => x.tipo === 'ADELANTO') ?? null;
    }

    if (codigo === '003') {
      return this.detallesVacacion.find((x) => x.tipo === 'REPROG_NUEVO') ?? null;
    }

    if (codigo === '004') {
      return this.detallesVacacion.find((x) => x.tipo === 'FRACC_1') ?? null;
    }

    return null;
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSustento = input.files?.[0] ?? null;
  }

  guardar(): void {
    this.error.set(null);

    if (!this.tipoSolicitud?.id) {
      this.error.set('No se recibió el tipo de papeleta.');
      return;
    }

    if (!this.tipoVacacionId) {
      this.error.set('Seleccione el tipo de vacación.');
      return;
    }

    if (this.detallesVacacion.length === 0) {
      this.error.set('Ingrese el detalle de vacaciones.');
      return;
    }

    for (const detalle of this.detallesVacacion) {
      this.calcularDias(detalle);

      if (
        !detalle.fechaInicio ||
        !detalle.fechaFin ||
        !detalle.totalDias ||
        detalle.totalDias <= 0
      ) {
        this.error.set(`Complete correctamente el periodo: ${detalle.titulo}.`);
        return;
      }

      // Art. 34 — tope de 30 días calendario por período (con el +2 del viernes ya incluido).
      if (detalle.totalDias > this.MAX_DIAS_LEGAL) {
        this.error.set(
          `El periodo "${detalle.titulo}" (${detalle.totalDias} días) supera el máximo legal de ` +
            `${this.MAX_DIAS_LEGAL} días calendario (Art. 34).`,
        );
        return;
      }
    }

    if (this.esAdelanto() && this.excedeAdelanto()) {
      const saldo = this.saldoProporcional();
      this.error.set(
        `El adelanto (${this.diasAdelantoSolicitados()} día(s)) excede el saldo proporcional disponible` +
          (saldo
            ? ` (${saldo.saldoDisponible} día(s) = ${saldo.mesesEfectivos} mes(es) × 2.5).`
            : '.'),
      );
      return;
    }

    // Art. 35 — fraccionamiento: bloqueo por reglas b) y c) (fail-early). El backend revalida
    // en días hábiles (con feriados) y por período — no se confía en el cliente.
    if (this.excedeFraccionamiento()) {
      this.error.set(
        this.excedeBolsaHabiles()
          ? `Ha superado el límite legal de 7 días hábiles fraccionables por período (Art. 35.b). ` +
            `Solicitados: ${this.diasHabilesFraccionados()}.`
          : `No puede tomar más de 4 días hábiles fraccionados en una misma semana (Art. 35.c).`,
      );
      return;
    }

    // Opción 1 — Programación sin saldo suficiente: se bloquea aquí (fail-early). El backend
    // revalida contra INDECI_VACACION_SALDO (no se confía en el cliente).
    if (this.excedeProgramacion()) {
      this.error.set(
        `No cuenta con saldo suficiente para programar ${this.diasProgramacionSolicitados()} día(s) ` +
          `(disponible: ${this.saldoDisponible()} día(s)). Si aún no cumple su año de servicio, ` +
          `registre su solicitud como Adelanto de Vacaciones.`,
      );
      return;
    }

    if (this.requiereMotivo() && !this.motivo.trim()) {
      this.error.set('Ingrese el motivo de la solicitud.');
      return;
    }

    if (this.requiereSustento() && !this.archivoSustento) {
      this.error.set('Debe adjuntar el documento de sustento.');
      return;
    }

    if (this.requiereObservacion() && !this.observacion.trim()) {
      this.error.set('Debe ingresar una observación.');
      return;
    }

    if (!this.requiereSustento()) {
      this.archivoSustento = null;
    }

    const principal = this.detallePrincipal();

    if (!principal) {
      this.error.set('No se pudo determinar el periodo principal de vacaciones.');
      return;
    }

    const detalles: DetalleVacacionRequest[] = this.detallesVacacion.map((x) => ({
      tipo: x.tipo,
      fechaInicio: x.fechaInicio,
      fechaFin: x.fechaFin,
      totalDias: Number(x.totalDias),
      vacacionOrigenId: x.vacacionOrigenId ?? null,
    }));

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),
      tipoVacacionId: Number(this.tipoVacacionId),

      fechaInicio: principal.fechaInicio,
      fechaFin: principal.fechaFin,
      cantidadDias: principal.totalDias,

      motivo: this.requiereMotivo() ? this.motivo.trim() : null,
      observacion: this.requiereObservacion() ? this.observacion.trim() : null,

      horaInicio: null,
      horaFin: null,
      cantidadHoras: null,
      lugarComision: null,

      detallesVacacion: detalles,
    };

    this.guardando.set(true);

    this.service.crearSolicitud(payload, this.archivoSustento).subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.guardando.set(false);

        const mensaje =
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo registrar las vacaciones.';

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
