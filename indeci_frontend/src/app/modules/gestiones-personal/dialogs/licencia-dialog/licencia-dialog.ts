import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  CrearSolicitudRrhhRequest,
  SolicitudesRrhhService,
  TipoLicencia,
  TipoSolicitudRrhh,
} from '../../services/solicitudes-rrhh';
interface LicenciaDialogData {
  tipoSolicitud: TipoSolicitudRrhh;
  tipoLicenciaNombre?: string;
}
@Component({
  selector: 'app-licencia-dialog',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './licencia-dialog.html',
  styleUrl: './licencia-dialog.scss',
})
export class LicenciaDialog implements OnInit {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialogRef = inject(MatDialogRef<LicenciaDialog>);

  tiposLicencia = signal<TipoLicencia[]>([]);
  cargandoTipos = signal(false);
  guardando = signal(false);
  enviando = signal(false);
  error = signal<string | null>(null);

  // SPEC_VACACIONES F9.1-bis — mini-asistente sin goce: form → (generar+firmar) → enviar.
  paso = signal<'form' | 'firma'>('form');
  solicitudId = signal<number | null>(null);
  papeletaFirmada: File | null = null;

  tituloDialog = 'Licencia';

  tipoLicenciaId: number | null = null;

  fechaInicio = '';
  fechaFin = '';
  cantidadDias: number | null = null;

  motivo = '';
  observacion = '';

  documento1 = '';
  documento2 = '';
  totalFolios: number | null = null;

  archivoSustento: File | null = null;

  tipoSolicitud!: TipoSolicitudRrhh;
  tipoLicenciaNombre: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: TipoSolicitudRrhh | LicenciaDialogData,
  ) {
    if ('tipoSolicitud' in data) {
      this.tipoSolicitud = data.tipoSolicitud;
      this.tipoLicenciaNombre = data.tipoLicenciaNombre ?? null;
    } else {
      this.tipoSolicitud = data;
    }

    this.tituloDialog = this.tipoSolicitud?.nombre ?? 'Licencia';
  }

  ngOnInit(): void {
    this.cargarTiposLicencia();
  }

  cargarTiposLicencia(): void {
    this.cargandoTipos.set(true);

    this.service.listarTiposLicencia().subscribe({
      next: (resp) => {
        const activos = (resp.data ?? []).filter((x) => Number(x.activo ?? 1) === 1);
        this.tiposLicencia.set(activos);
        this.cargandoTipos.set(false);

        this.seleccionarTipoLicenciaInicial();
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo de tipos de licencia.');
        this.cargandoTipos.set(false);
      },
    });
  }
  normalizarTexto(valor: string | null | undefined): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  /** SPEC_VACACIONES F9.1 — el flujo es "sin goce" si el nombre inicial lo indica. */
  esFlujoSinGoce(): boolean {
    return this.normalizarTexto(this.tipoLicenciaNombre).includes('SIN GOCE');
  }

  /** En flujo sin-goce, solo los subtipos legales es_sin_goce=1; si no, todos los activos. */
  tiposFiltrados(): TipoLicencia[] {
    const todos = this.tiposLicencia();
    return this.esFlujoSinGoce() ? todos.filter((t) => Number(t.esSinGoce ?? 0) === 1) : todos;
  }

  /** El subtipo elegido exige N° de Resolución Directoral. */
  requiereResolucionTipo(): boolean {
    return Number(this.tipoLicenciaSeleccionado()?.requiereResolucion ?? 0) === 1;
  }

  seleccionarTipoLicenciaInicial(): void {
    if (!this.tipoLicenciaNombre) {
      return;
    }

    // Flujo sin goce: NO se fuerza un tipo; el usuario elige el subtipo legal del dropdown.
    if (this.esFlujoSinGoce()) {
      this.tituloDialog = `${this.tipoSolicitud.nombre} - Sin goce de haber`;
      return;
    }

    const esperado = this.normalizarTexto(this.tipoLicenciaNombre);

    const tipo = this.tiposLicencia().find((x) => {
      const nombre = this.normalizarTexto(x.nombre);
      return nombre.includes(esperado) || esperado.includes(nombre);
    });

    if (!tipo) {
      this.error.set(`No se encontró el tipo de licencia: ${this.tipoLicenciaNombre}.`);
      return;
    }

    this.tipoLicenciaId = Number(tipo.id);
    this.tituloDialog = `${this.tipoSolicitud.nombre} - ${tipo.nombre}`;
  }
  codigoTipoSolicitud(): string {
    return String(this.tipoSolicitud?.codigo ?? '').padStart(3, '0');
  }

  requiereMotivo(): boolean {
    const codigosQueRequierenMotivo = ['007'];

    return codigosQueRequierenMotivo.includes(this.codigoTipoSolicitud());
  }
  tipoLicenciaSeleccionado(): TipoLicencia | null {
    return this.tiposLicencia().find((x) => Number(x.id) === Number(this.tipoLicenciaId)) ?? null;
  }

  nombreTipoLicenciaSeleccionado(): string {
    return this.tipoLicenciaSeleccionado()?.nombre ?? this.tipoLicenciaNombre ?? '-';
  }
  requiereSustento(): boolean {
    return Number(this.tipoSolicitud?.requiereSustento ?? 0) === 1;
  }

  requiereObservacion(): boolean {
    return Number(this.tipoSolicitud?.requiereObservacion ?? 0) === 1;
  }

  calcularDias(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      this.cantidadDias = null;
      return;
    }

    const inicio = new Date(`${this.fechaInicio}T00:00:00`);
    const fin = new Date(`${this.fechaFin}T00:00:00`);

    const diferenciaMs = fin.getTime() - inicio.getTime();
    const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)) + 1;

    this.cantidadDias = dias > 0 ? dias : null;

    if (dias <= 0) {
      this.error.set('La fecha fin no puede ser menor que la fecha inicio.');
      return;
    }

    this.error.set(null);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSustento = input.files?.[0] ?? null;
    if (this.archivoSustento) this.error.set(null); // limpiar error stale al elegir archivo
  }

  // ============ SPEC_VACACIONES F9.1-bis — asistente de firma (licencia sin goce) ============

  onPapeletaFirmadaSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.papeletaFirmada = input.files?.[0] ?? null;
    if (this.papeletaFirmada) this.error.set(null);
  }

  private descargarBlob(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Paso 1 (sin goce): valida, crea la papeleta (PENDIENTE_FIRMA), descarga el PDF y pasa a "firma". */
  generarPapeleta(): void {
    this.error.set(null);

    if (!this.tipoLicenciaId) {
      this.error.set('Seleccione el subtipo de licencia sin goce.');
      return;
    }
    if (!this.fechaInicio || !this.fechaFin) {
      this.error.set('Ingrese la fecha de inicio y fin.');
      return;
    }
    this.calcularDias();
    if (!this.cantidadDias || this.cantidadDias <= 0) {
      this.error.set('La fecha fin no puede ser menor que la fecha inicio.');
      return;
    }
    if (!this.totalFolios || this.totalFolios <= 0) {
      this.error.set('Ingrese el total de folios.');
      return;
    }
    if (!this.archivoSustento) {
      this.error.set('Debe adjuntar el archivo de sustento (obligatorio para licencia sin goce).');
      return;
    }

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),
      tipoLicenciaId: Number(this.tipoLicenciaId),
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: this.cantidadDias,
      motivo: null,
      observacion: null,
      horaInicio: null,
      horaFin: null,
      cantidadHoras: null,
      lugarComision: null,
      documento1: null,
      documento2: null,
      totalFolios: this.totalFolios,
    };

    this.guardando.set(true);
    this.service.crearSolicitud(payload, this.archivoSustento).subscribe({
      next: (resp) => {
        const id = Number((resp as { data?: unknown })?.data);
        if (!id) {
          this.guardando.set(false);
          this.error.set('No se obtuvo el ID de la papeleta creada.');
          return;
        }
        this.solicitudId.set(id);
        this.service.descargarFormatoPapeleta(id).subscribe({
          next: (blob) => {
            this.descargarBlob(blob, `papeleta_${id}.pdf`);
            this.guardando.set(false);
            this.paso.set('firma');
          },
          error: () => {
            this.guardando.set(false);
            this.paso.set('firma');
            this.error.set(
              'Papeleta creada, pero no se pudo descargar el PDF. Use "Descargar papeleta" abajo.',
            );
          },
        });
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo generar la papeleta.');
      },
    });
  }

  /** Re-descarga el PDF oficial (por si el empleado lo perdió). */
  descargarPapeletaOtraVez(): void {
    const id = this.solicitudId();
    if (!id) return;
    this.service.descargarFormatoPapeleta(id).subscribe({
      next: (blob) => this.descargarBlob(blob, `papeleta_${id}.pdf`),
      error: () => this.error.set('No se pudo descargar el PDF.'),
    });
  }

  /** Paso 2 (sin goce): sube la papeleta firmada y envía al jefe. */
  enviarAlJefe(): void {
    this.error.set(null);
    const id = this.solicitudId();
    if (!id) return;
    if (!this.papeletaFirmada) {
      this.error.set('Adjunte la papeleta firmada antes de enviar.');
      return;
    }
    this.enviando.set(true);
    this.service.enviarPapeletaFirmada(id, this.papeletaFirmada).subscribe({
      next: () => {
        this.enviando.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.enviando.set(false);
        this.error.set(err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo enviar la papeleta.');
      },
    });
  }

  guardar(): void {
    this.error.set(null);

    if (!this.tipoSolicitud?.id) {
      this.error.set('No se recibió el tipo de papeleta.');
      return;
    }

    if (!this.tipoLicenciaId) {
      this.error.set('Seleccione el tipo de licencia.');
      return;
    }

    if (!this.fechaInicio || !this.fechaFin) {
      this.error.set('Ingrese la fecha de inicio y la fecha fin.');
      return;
    }

    this.calcularDias();

    if (!this.cantidadDias || this.cantidadDias <= 0) {
      this.error.set('La fecha fin no puede ser menor que la fecha inicio.');
      return;
    }

    if (this.requiereMotivo() && !this.motivo.trim()) {
      this.error.set('Ingrese el motivo de la licencia.');
      return;
    }

    // Licencia SIN GOCE: no pide "documento presentado"; el sustento es el archivo (obligatorio).
    if (!this.esFlujoSinGoce() && !this.documento1.trim()) {
      this.error.set('Ingrese el documento presentado 1.');
      return;
    }

    if (!this.totalFolios || this.totalFolios <= 0) {
      this.error.set('Ingrese el total de folios.');
      return;
    }

    if ((this.esFlujoSinGoce() || this.requiereSustento()) && !this.archivoSustento) {
      this.error.set(
        this.esFlujoSinGoce()
          ? 'Debe adjuntar el archivo de sustento (obligatorio para licencia sin goce).'
          : 'Debe adjuntar el documento de sustento.',
      );
      return;
    }

    if (this.requiereObservacion() && !this.observacion.trim()) {
      this.error.set('Debe ingresar una observación.');
      return;
    }

    if (!this.requiereSustento() && !this.esFlujoSinGoce()) {
      this.archivoSustento = null;
    }

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),
      tipoLicenciaId: Number(this.tipoLicenciaId),

      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: this.cantidadDias,

      motivo: this.requiereMotivo() ? this.motivo.trim() : null,
      observacion: this.requiereObservacion() ? this.observacion.trim() : null,

      horaInicio: null,
      horaFin: null,
      cantidadHoras: null,
      lugarComision: null,

      documento1: this.documento1.trim(),
      documento2: this.documento2.trim() || null,
      totalFolios: this.totalFolios,
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
          err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo registrar la licencia.';

        this.error.set(mensaje);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
