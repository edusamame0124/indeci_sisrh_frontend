import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  DetalleVacacionRequest,
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
}

interface VacacionesDialogData {
  tipoSolicitud: TipoSolicitudRrhh;
  tipoVacacionCodigo?: string;
  tipoVacacionNombre?: string;
}

@Component({
  selector: 'app-vacaciones-dialog',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './vacaciones-dialog.html',
  styleUrl: './vacaciones-dialog.scss',
})
export class VacacionesDialog implements OnInit {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<VacacionesDialog>);

  tiposVacacion = signal<TipoVacacion[]>([]);
  cargandoTipos = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);

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
    }

    if (codigo === '003') {
      this.detallesVacacion.push(
        {
          tipo: 'REPROG_ACTUAL',
          titulo: 'Periodo actual',
          fechaInicio: '',
          fechaFin: '',
          totalDias: null,
        },
        {
          tipo: 'REPROG_NUEVO',
          titulo: 'Nuevo periodo 1',
          fechaInicio: '',
          fechaFin: '',
          totalDias: null,
        },
      );
    }

    if (codigo === '004') {
      this.detallesVacacion.push(
        {
          tipo: 'FRACC_ACTUAL',
          titulo: 'Periodo actual',
          fechaInicio: '',
          fechaFin: '',
          totalDias: null,
        },
        {
          tipo: 'FRACC_1',
          titulo: 'Fracción 1',
          fechaInicio: '',
          fechaFin: '',
          totalDias: null,
        },
      );
    }
  }

  calcularDias(detalle: DetalleVacacionForm): void {
    if (!detalle.fechaInicio || !detalle.fechaFin) {
      detalle.totalDias = null;
      return;
    }

    const inicio = new Date(`${detalle.fechaInicio}T00:00:00`);
    const fin = new Date(`${detalle.fechaFin}T00:00:00`);

    const diferenciaMs = fin.getTime() - inicio.getTime();
    const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)) + 1;

    detalle.totalDias = dias > 0 ? dias : null;

    if (dias <= 0) {
      this.error.set('La fecha fin no puede ser menor que la fecha inicio.');
      return;
    }

    this.error.set(null);
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
