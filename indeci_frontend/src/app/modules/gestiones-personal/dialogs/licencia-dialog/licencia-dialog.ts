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

/** Modalidad de goce elegida en el formulario único. */
type ModalidadGoce = 'CON_GOCE' | 'SIN_GOCE';

/**
 * SPEC_VACACIONES F9.2 — subtipos con goce cuyo tope es FIJO (autocompleta fecha fin):
 * descanso pre/post natal (98) y onomástico (1). El resto de topes son máximos (valida ≤).
 * Se identifican por CODIGO estable (no por monto), la fuente del tope sigue en BD (MAX_DIAS).
 */
const CODIGOS_DIAS_FIJOS = ['LIC_CG_MAT', 'LIC_CG_ONO'];

/** Subtipo sin goce "Otros motivos" — habilita el textarea de detalle. */
const CODIGO_SIN_GOCE_OTROS = 'LIC_SIN_OTR';

/**
 * Filas "contenedor" legacy del catálogo que NO son motivos reales (eran las etiquetas
 * del menú anterior). Se ocultan de los selects; la ruta legacy "A cuenta" sigue usándolas
 * por nombre, así que no se desactivan en BD.
 */
const NOMBRES_CONTENEDOR_EXCLUIDOS = [
  'A CUENTA DEL PERIODO VACACIONAL',
  'CON GOCE DE REMUNERACIONES',
  'SIN GOCE DE REMUNERACIONES',
];

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

  // SPEC_VACACIONES F9.2 — formulario único: se elige la modalidad de goce en el propio form.
  esModoUnificado = false;
  modalidadGoce: ModalidadGoce | null = null;

  tipoLicenciaId: number | null = null;

  fechaInicio = '';
  fechaFin = '';
  cantidadDias: number | null = null;

  motivo = '';
  observacion = '';

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

    // Sin nombre preseleccionado → formulario único (elige modalidad con/sin goce).
    this.esModoUnificado = !this.tipoLicenciaNombre;

    this.tituloDialog = this.esModoUnificado
      ? 'Nueva licencia'
      : this.tipoSolicitud?.nombre ?? 'Licencia';
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
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .trim();
  }

  /** El flujo es "sin goce" si el usuario eligió esa modalidad (o el nombre legacy lo indica). */
  esFlujoSinGoce(): boolean {
    if (this.esModoUnificado) {
      return this.modalidadGoce === 'SIN_GOCE';
    }
    return this.normalizarTexto(this.tipoLicenciaNombre).includes('SIN GOCE');
  }

  /** true si la fila es un "contenedor" legacy que no debe ofrecerse como motivo. */
  private esContenedorGenerico(tipo: TipoLicencia): boolean {
    return NOMBRES_CONTENEDOR_EXCLUIDOS.includes(this.normalizarTexto(tipo.nombre));
  }

  /** Subtipos ofrecidos según la modalidad elegida (con/sin goce). */
  tiposFiltrados(): TipoLicencia[] {
    const todos = this.tiposLicencia().filter((t) => !this.esContenedorGenerico(t));

    if (this.esModoUnificado) {
      if (this.modalidadGoce === 'SIN_GOCE') {
        return todos.filter((t) => Number(t.esSinGoce ?? 0) === 1);
      }
      if (this.modalidadGoce === 'CON_GOCE') {
        return todos.filter((t) => Number(t.esSinGoce ?? 0) === 0);
      }
      return [];
    }

    // Ruta legacy (p. ej. "A cuenta del periodo vacacional").
    return this.esFlujoSinGoce() ? todos.filter((t) => Number(t.esSinGoce ?? 0) === 1) : todos;
  }

  /** El subtipo elegido exige N° de Resolución Directoral. */
  requiereResolucionTipo(): boolean {
    return Number(this.tipoLicenciaSeleccionado()?.requiereResolucion ?? 0) === 1;
  }

  /** Reinicia la selección dependiente al cambiar la modalidad de goce. */
  onModalidadChange(): void {
    this.tipoLicenciaId = null;
    this.motivo = '';
    this.cantidadDias = null;
    this.error.set(null);
    this.tituloDialog =
      this.modalidadGoce === 'SIN_GOCE'
        ? 'Nueva licencia - Sin goce de haber'
        : this.modalidadGoce === 'CON_GOCE'
          ? 'Nueva licencia - Con goce de remuneraciones'
          : 'Nueva licencia';
  }

  /** Al cambiar el motivo: autocompleta fechas de topes fijos y revalida. */
  onTipoLicenciaChange(): void {
    if (!this.esMotivoOtros()) {
      this.motivo = '';
    }
    this.error.set(null);
    this.aplicarTopeFijo();
    this.calcularDias();
  }

  seleccionarTipoLicenciaInicial(): void {
    if (!this.tipoLicenciaNombre) {
      return;
    }

    // Flujo sin goce legacy: NO se fuerza un tipo; el usuario elige el subtipo del dropdown.
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

  // ============ SPEC_VACACIONES F9.2 — topes de días y motivo "otros" ============

  /** Tope de días del motivo elegido (null = sin tope). */
  topeDias(): number | null {
    const tope = this.tipoLicenciaSeleccionado()?.maxDias;
    return tope != null && tope > 0 ? Number(tope) : null;
  }

  /** El motivo elegido es "Otros motivos" (sin goce) → habilita el textarea de detalle. */
  esMotivoOtros(): boolean {
    if (!this.esFlujoSinGoce()) {
      return false;
    }
    const sel = this.tipoLicenciaSeleccionado();
    return (
      sel?.codigo === CODIGO_SIN_GOCE_OTROS ||
      this.normalizarTexto(sel?.nombre).includes('OTROS MOTIVOS')
    );
  }

  /** El tope del motivo es FIJO (autocompleta fecha fin) en lugar de máximo. */
  private esDiasFijos(): boolean {
    const codigo = this.tipoLicenciaSeleccionado()?.codigo ?? '';
    return CODIGOS_DIAS_FIJOS.includes(codigo);
  }

  /** La fecha fin se calcula sola (tope fijo) → el campo se muestra de solo lectura. */
  esFechaFinAuto(): boolean {
    return this.esDiasFijos() && this.topeDias() != null && !!this.fechaInicio;
  }

  /** Texto del chip informativo del tope (o null si no aplica). */
  textoTope(): string | null {
    const tope = this.topeDias();
    if (tope == null) {
      return null;
    }
    return this.esDiasFijos() ? `${tope} día(s)` : `Máx. ${tope} día(s)`;
  }

  private sumarDiasISO(fechaISO: string, dias: number): string {
    const base = new Date(`${fechaISO}T00:00:00`);
    base.setDate(base.getDate() + dias);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Autocompleta la fecha fin cuando el motivo tiene un tope FIJO. */
  private aplicarTopeFijo(): void {
    const tope = this.topeDias();
    if (tope != null && this.esDiasFijos() && this.fechaInicio) {
      this.fechaFin = this.sumarDiasISO(this.fechaInicio, tope - 1);
    }
  }

  requiereSustento(): boolean {
    return Number(this.tipoSolicitud?.requiereSustento ?? 0) === 1;
  }

  requiereObservacion(): boolean {
    return Number(this.tipoSolicitud?.requiereObservacion ?? 0) === 1;
  }

  calcularDias(): void {
    this.aplicarTopeFijo();

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

    const tope = this.topeDias();
    if (tope != null && dias > tope) {
      this.error.set(`La licencia excede el máximo permitido para este motivo (${tope} día(s)).`);
      return;
    }

    this.error.set(null);
  }

  /** Valida el tope de días; devuelve true si es válido. */
  private validarTope(): boolean {
    const tope = this.topeDias();
    if (tope != null && this.cantidadDias != null && this.cantidadDias > tope) {
      this.error.set(`La licencia excede el máximo permitido para este motivo (${tope} día(s)).`);
      return false;
    }
    return true;
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
    if (!this.validarTope()) {
      return;
    }
    if (this.esMotivoOtros() && !this.motivo.trim()) {
      this.error.set('Ingrese el detalle de los otros motivos.');
      return;
    }
    if (this.totalFolios !== null && this.totalFolios <= 0) {
      this.error.set('El total de folios debe ser mayor a 0.');
      return;
    }

    const payload: CrearSolicitudRrhhRequest = {
      tipoSolicitudId: Number(this.tipoSolicitud.id),
      tipoLicenciaId: Number(this.tipoLicenciaId),
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      cantidadDias: this.cantidadDias,
      motivo: this.esMotivoOtros() ? this.motivo.trim() : null,
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

    if (this.esModoUnificado && !this.modalidadGoce) {
      this.error.set('Seleccione la modalidad de goce.');
      return;
    }

    if (!this.tipoLicenciaId) {
      this.error.set('Seleccione el motivo de la licencia.');
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

    if (!this.validarTope()) {
      return;
    }

    if (this.requiereMotivo() && !this.motivo.trim()) {
      this.error.set('Ingrese el motivo de la licencia.');
      return;
    }

    if (this.totalFolios !== null && this.totalFolios <= 0) {
      this.error.set('El total de folios debe ser mayor a 0.');
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

      documento1: null,
      documento2: null,
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
