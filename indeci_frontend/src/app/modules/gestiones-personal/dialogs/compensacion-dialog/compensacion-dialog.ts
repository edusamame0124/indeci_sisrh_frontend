import { Component, Inject, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  DetalleCompensacionRequest,
  MiJornadaRefrigerio,
  SolicitudesRrhhService,
  SolicitudRrhh,
  TipoSolicitudRrhh,
} from '../../services/solicitudes-rrhh';

interface DetalleCompensacionForm {
  fechaCompensacion: string;
  horaInicio: string;
  horaFin: string;
  cantidadHoras: number | null;
  cantidadHorasTexto: string;
}

interface CompensacionDialogData {
  tipoSolicitud: TipoSolicitudRrhh;
  /** Presente solo en modo edición: papeleta propia en BORRADOR a modificar. */
  solicitudExistente?: SolicitudRrhh;
}

@Component({
  selector: 'app-compensacion-dialog',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './compensacion-dialog.html',
  styleUrl: './compensacion-dialog.scss',
})
export class CompensacionDialog {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<CompensacionDialog>);

  guardando = signal(false);
  error = signal<string | null>(null);

  // Refrigerio vigente (régimen u Horario Especial) por fecha ISO — normativa SERVIR: un
  // permiso por horas puede cruzar el refrigerio, pero ese tramo no cuenta como tiempo
  // efectivo (2026-08-09). Cache para no repetir la consulta por cada recálculo.
  private readonly refrigerioPorFecha = new Map<string, MiJornadaRefrigerio>();

  tituloDialog = 'Permiso personal compensable por horas';

  fechaInicio = '';
  fechaFin = '';

  horaInicio = '';
  horaFin = '';
  cantidadHoras: number | null = null;
  cantidadHorasTexto = '';

  motivo = '';
  observacion = '';
  archivoSustento: File | null = null;

  detallesCompensacion: DetalleCompensacionForm[] = [
    {
      fechaCompensacion: '',
      horaInicio: '',
      horaFin: '',
      cantidadHoras: null,
      cantidadHorasTexto: '',
    },
  ];

  tipoSolicitud!: TipoSolicitudRrhh;
  /** Presente solo en modo edición: papeleta propia en BORRADOR a modificar. */
  solicitudExistente: SolicitudRrhh | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: TipoSolicitudRrhh | CompensacionDialogData,
  ) {
    if (data && 'tipoSolicitud' in data) {
      this.tipoSolicitud = data.tipoSolicitud;
      this.solicitudExistente = data.solicitudExistente ?? null;
    } else {
      this.tipoSolicitud = data;
    }

    this.tituloDialog = this.esEdicion()
      ? `Editar ${this.tipoSolicitud?.nombre ?? 'permiso compensable por horas'}`
      : (this.tipoSolicitud?.nombre ?? 'Permiso personal compensable por horas');

    if (this.solicitudExistente) {
      const s = this.solicitudExistente;
      this.fechaInicio = s.fechaInicio ?? '';
      this.fechaFin = s.fechaFin ?? s.fechaInicio ?? '';
      this.horaInicio = s.horaInicio ?? '';
      this.horaFin = s.horaFin ?? '';
      this.motivo = s.motivo ?? '';
      this.observacion = s.observacion ?? '';

      if (s.detallesCompensacion && s.detallesCompensacion.length > 0) {
        this.detallesCompensacion = s.detallesCompensacion.map((det) => ({
          fechaCompensacion: det.fechaCompensacion,
          horaInicio: det.horaInicio,
          horaFin: det.horaFin,
          cantidadHoras: det.cantidadHoras,
          cantidadHorasTexto: this.formatearHoras(det.cantidadHoras ?? 0),
        }));
      }

      // Precarga el refrigerio de cada fecha involucrada antes del primer cálculo, para
      // que las horas mostradas al abrir el diálogo ya sean las efectivas (no de reloj).
      const fechas = new Set(
        [this.fechaInicio, ...this.detallesCompensacion.map((d) => d.fechaCompensacion)].filter(
          (f): f is string => !!f,
        ),
      );
      let pendientes = fechas.size;
      if (pendientes === 0) {
        this.calcularHorasPermiso();
      } else {
        fechas.forEach((fecha) =>
          this.cargarRefrigerio(fecha, () => {
            pendientes -= 1;
            if (pendientes === 0) {
              this.recalcularTodo();
            }
          }),
        );
      }
    }
  }

  esEdicion(): boolean {
    return !!this.solicitudExistente?.id;
  }

  requiereSustento(): boolean {
    return Number(this.tipoSolicitud?.requiereSustento ?? 0) === 1;
  }

  requiereObservacion(): boolean {
    return Number(this.tipoSolicitud?.requiereObservacion ?? 0) === 1;
  }
  codigoTipoSolicitud(): string {
    return String(this.tipoSolicitud?.codigo ?? '').padStart(3, '0');
  }

  requiereMotivo(): boolean {
    const codigosQueRequierenMotivo = ['007'];

    return codigosQueRequierenMotivo.includes(this.codigoTipoSolicitud());
  }
  onFechaInicioChange(): void {
    this.fechaFin = this.fechaInicio;
    this.cargarRefrigerio(this.fechaInicio, () => this.calcularHorasPermiso());
  }

  onFechaCompensacionChange(detalle: DetalleCompensacionForm): void {
    this.cargarRefrigerio(detalle.fechaCompensacion, () => this.calcularHorasDetalle(detalle));
  }

  /**
   * Carga (con cache) el refrigerio vigente de una fecha y ejecuta `onLoaded` al terminar
   * — igual si la fecha ya estaba en cache (se ejecuta de inmediato) que si hay que
   * consultarla al backend. Fallback silencioso a "sin refrigerio" ante error, para no
   * bloquear el formulario por un problema de red.
   */
  private cargarRefrigerio(fecha: string, onLoaded: () => void): void {
    if (!fecha) {
      onLoaded();
      return;
    }
    if (this.refrigerioPorFecha.has(fecha)) {
      onLoaded();
      return;
    }
    this.service.obtenerMiRefrigerio(fecha).subscribe({
      next: (res) => {
        this.refrigerioPorFecha.set(fecha, res.data);
        onLoaded();
      },
      error: () => {
        this.refrigerioPorFecha.set(fecha, { refrigerioInicio: null, refrigerioFin: null });
        onLoaded();
      },
    });
  }

  private recalcularTodo(): void {
    this.calcularHorasPermiso();
    this.detallesCompensacion.forEach((detalle) => this.calcularHorasDetalle(detalle));
  }

  calcularHorasPermiso(): void {
    if (!this.horaInicio || !this.horaFin) {
      this.cantidadHoras = null;
      this.cantidadHorasTexto = '';
      return;
    }

    const horas = this.calcularDiferenciaHoras(this.fechaInicio, this.horaInicio, this.horaFin);

    if (horas <= 0) {
      this.cantidadHoras = null;
      this.cantidadHorasTexto = '';
      this.error.set('La hora de ingreso no puede ser menor o igual que la hora de salida.');
      return;
    }

    this.cantidadHoras = horas;
    this.cantidadHorasTexto = this.formatearHoras(horas);
    this.error.set(null);
  }

  calcularHorasDetalle(detalle: DetalleCompensacionForm): void {
    if (!detalle.horaInicio || !detalle.horaFin) {
      detalle.cantidadHoras = null;
      detalle.cantidadHorasTexto = '';
      return;
    }

    const horas = this.calcularDiferenciaHoras(
      detalle.fechaCompensacion,
      detalle.horaInicio,
      detalle.horaFin,
    );

    if (horas <= 0) {
      detalle.cantidadHoras = null;
      detalle.cantidadHorasTexto = '';
      this.error.set(
        'En la compensación, la hora fin no puede ser menor o igual que la hora inicio.',
      );
      return;
    }

    detalle.cantidadHoras = horas;
    detalle.cantidadHorasTexto = this.formatearHoras(horas);
    this.error.set(null);
  }

  private aMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Horas EFECTIVAS entre [horaInicio, horaFin) en `fecha`: resta de reloj menos la
   * intersección con el refrigerio vigente ese día (régimen u Horario Especial) — mismo
   * criterio que `SolicitudRrhhService.calcularHoras()` en el backend, para que el número
   * que ve el usuario coincida con lo que se va a guardar.
   */
  calcularDiferenciaHoras(fecha: string, horaInicio: string, horaFin: string): number {
    const inicioMinutos = this.aMinutos(horaInicio);
    const finMinutos = this.aMinutos(horaFin);
    const minutosBrutos = finMinutos - inicioMinutos;

    if (minutosBrutos <= 0) {
      return minutosBrutos / 60;
    }

    const refrigerio = this.refrigerioPorFecha.get(fecha);
    let minutosRefrigerio = 0;

    if (refrigerio?.refrigerioInicio && refrigerio?.refrigerioFin) {
      const refrigerioInicioMin = this.aMinutos(refrigerio.refrigerioInicio);
      const refrigerioFinMin = this.aMinutos(refrigerio.refrigerioFin);
      const solapeInicio = Math.max(inicioMinutos, refrigerioInicioMin);
      const solapeFin = Math.min(finMinutos, refrigerioFinMin);
      minutosRefrigerio = Math.max(0, solapeFin - solapeInicio);
    }

    return (minutosBrutos - minutosRefrigerio) / 60;
  }

  formatearHoras(valor: number): string {
    const totalMinutos = Math.round(valor * 60);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    return `${horas} hora(s) ${minutos} minuto(s)`;
  }

  totalHorasCompensadas(): number {
    return this.detallesCompensacion.reduce(
      (total, item) => total + Number(item.cantidadHoras ?? 0),
      0,
    );
  }

  totalHorasCompensadasTexto(): string {
    return this.formatearHoras(this.totalHorasCompensadas());
  }

  agregarCompensacion(): void {
    this.detallesCompensacion.push({
      fechaCompensacion: '',
      horaInicio: '',
      horaFin: '',
      cantidadHoras: null,
      cantidadHorasTexto: '',
    });
  }

  quitarCompensacion(index: number): void {
    if (this.detallesCompensacion.length === 1) {
      this.error.set('Debe registrar al menos una compensación.');
      return;
    }

    this.detallesCompensacion.splice(index, 1);
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

    this.fechaFin = this.fechaInicio;

    if (!this.fechaInicio) {
      this.error.set('Ingrese la fecha del permiso.');
      return;
    }

    if (!this.horaInicio || !this.horaFin) {
      this.error.set('Ingrese la hora de salida y la hora de ingreso.');
      return;
    }

    this.calcularHorasPermiso();

    if (!this.cantidadHoras || this.cantidadHoras <= 0) {
      this.error.set('La hora de ingreso no puede ser menor o igual que la hora de salida.');
      return;
    }

    if (this.requiereMotivo() && !this.motivo.trim()) {
      this.error.set('Ingrese el motivo de la solicitud.');
      return;
    }

    if (this.requiereSustento() && !this.esEdicion() && !this.archivoSustento) {
      this.error.set('Debe adjuntar el documento de sustento.');
      return;
    }

    if (this.requiereObservacion() && !this.observacion.trim()) {
      this.error.set('Debe ingresar una observación.');
      return;
    }

    for (const detalle of this.detallesCompensacion) {
      if (!detalle.fechaCompensacion) {
        this.error.set('Ingrese la fecha de compensación.');
        return;
      }

      if (!detalle.horaInicio || !detalle.horaFin) {
        this.error.set('Ingrese la hora inicio y hora fin de la compensación.');
        return;
      }

      this.calcularHorasDetalle(detalle);

      if (!detalle.cantidadHoras || detalle.cantidadHoras <= 0) {
        this.error.set('Complete correctamente las horas de compensación.');
        return;
      }
    }

    const totalCompensado = this.totalHorasCompensadas();

    if (Math.abs(totalCompensado - this.cantidadHoras) > 0.01) {
      this.error.set(
        `El total compensado (${this.formatearHoras(totalCompensado)}) debe ser igual al permiso solicitado (${this.formatearHoras(this.cantidadHoras)}).`,
      );
      return;
    }

    if (!this.requiereSustento()) {
      this.archivoSustento = null;
    }

    const detalles: DetalleCompensacionRequest[] = this.detallesCompensacion.map((item) => ({
      fechaCompensacion: item.fechaCompensacion,
      horaInicio: item.horaInicio,
      horaFin: item.horaFin,
      cantidadHoras: Number(item.cantidadHoras),
    }));

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),

      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: null,

      motivo: this.requiereMotivo() ? this.motivo.trim() : null,
      observacion: this.requiereObservacion() ? this.observacion.trim() : null,

      horaInicio: this.horaInicio,
      horaFin: this.horaFin,
      cantidadHoras: this.cantidadHoras,

      lugarComision: null,
      detallesCompensacion: detalles,
    };

    this.guardando.set(true);

    const obs$ = this.esEdicion()
      ? this.service.editarSolicitud(this.solicitudExistente!.id, payload)
      : this.service.crearSolicitud(payload, this.archivoSustento);

    obs$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.guardando.set(false);

        const mensaje =
          err?.error?.mensaje ??
          err?.error?.message ??
          (this.esEdicion()
            ? 'No se pudo editar la compensación.'
            : 'No se pudo registrar la compensación.');

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
