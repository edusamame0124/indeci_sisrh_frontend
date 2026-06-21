import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  inject,
  signal,
  computed,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MetaPptoApiService } from '../../../../services/meta-ppto-api.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import type { MetaLoteTipo, MetaPptoLote, MetaPptoLoteDet, MetaPptoCat } from '../../../../models/meta-ppto.model';
import { CorreccionExcepcionesComponent } from './components/correccion-excepciones/correccion-excepciones.component';
import { ValidarAprobarComponent } from './components/validar-aprobar/validar-aprobar.component';

export interface TipoProcesoOption {
  valor: MetaLoteTipo;
  etiqueta: string;
  descripcion: string;
}

export const TIPOS_PROCESO: TipoProcesoOption[] = [
  {
    valor: 'COPIA_ANIO_ANTERIOR',
    etiqueta: 'Copiar año anterior',
    descripcion: 'Copia todas las asignaciones del año origen aplicando equivalencias vigentes.',
  },
  {
    valor: 'APLICACION_EQUIVALENCIAS',
    etiqueta: 'Aplicar equivalencias',
    descripcion: 'Aplica solo las equivalencias configuradas sin copiar asignaciones previas.',
  },
  {
    valor: 'REGULARIZACION',
    etiqueta: 'Regularización',
    descripcion: 'Proceso de corrección puntual para ajustar asignaciones existentes.',
  },
];

@Component({
  selector: 'app-wizard-actualizacion',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatStepperModule,
    MatTableModule,
    MatTooltipModule,
    CorreccionExcepcionesComponent,
    ValidarAprobarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wizard-actualizacion.component.html',
  styleUrl: './wizard-actualizacion.component.css',
})
export class WizardActualizacionComponent implements OnChanges {
  @Input() anioFiscal = 0;

  private readonly api    = inject(MetaPptoApiService);
  private readonly snack  = inject(MatSnackBar);
  private readonly notif  = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);

  readonly tiposProcesoOpts = TIPOS_PROCESO;

  // Estado del wizard
  readonly pasoActual  = signal(0);
  readonly procesando  = signal(false);

  // Configuración del lote
  readonly anioOrigen      = signal(new Date().getFullYear());
  readonly tipoProceso     = signal<MetaLoteTipo>('COPIA_ANIO_ANTERIOR');
  readonly observacionLote = signal('');

  // Datos del proceso
  readonly lote = signal<MetaPptoLote | null>(null);
  readonly detalles = signal<MetaPptoLoteDet[]>([]);
  readonly observados = signal<MetaPptoLoteDet[]>([]);
  readonly lotesPrevios = signal<MetaPptoLote[]>([]);

  // Para resolver excepción seleccionada
  readonly excepcionSeleccionada = signal<MetaPptoLoteDet | null>(null);
  readonly metaDestinoResolver = signal<number | null>(null);
  readonly metasCatalogo = signal<MetaPptoCat[]>([]);

  readonly columnasDet = ['empleadoDni', 'empleadoNombre', 'metaOrigenCodigo', 'metaDestinoCodigo', 'estadoValidacion', 'mensaje'] as const;
  readonly columnasObs = ['empleadoDni', 'empleadoNombre', 'estadoValidacion', 'mensaje', 'accion', 'resolver'] as const;

  readonly hayObservados = computed(() => this.observados().length > 0);
  readonly todoOk = computed(() => !this.hayObservados());

  ngOnChanges(): void {
    if (this.anioFiscal > 0) this.cargarLotesPrevios();
  }

  cargarLotesPrevios(): void {
    this.api.listarLotes(this.anioFiscal).subscribe({
      next: (lotes) => this.lotesPrevios.set(lotes),
      error: () => {},
    });
  }

  // ===================== PASO 1: Crear y procesar lote =====================

  crearYProcesar(): void {
    if (this.procesando()) return;
    this.procesando.set(true);

    this.api
      .crearLote({
        anioOrigen: this.anioOrigen(),
        anioDestino: this.anioFiscal,
        tipoProceso: this.tipoProceso(),
        observacion: this.observacionLote() || null,
      })
      .subscribe({
        next: (lote) => {
          this.lote.set(lote);
          // Iniciar procesamiento
          this.api.procesarLote(lote.id).subscribe({
            next: (loteProcesado) => {
              this.lote.set(loteProcesado);
              this.procesando.set(false);
              this.pasoActual.set(1);
              this.cargarDetalles(loteProcesado.id);
              this.cargarLotesPrevios();
            },
            error: (err: HttpErrorResponse) => {
              this.procesando.set(false);
              this.mostrarError(err);
            },
          });
        },
        error: (err: HttpErrorResponse) => {
          this.procesando.set(false);
          this.mostrarError(err);
        },
      });
  }

  // ===================== PASO 2: Vista previa =====================

  cargarDetalles(loteId: number): void {
    this.api.detallesLote(loteId).subscribe({ next: (d) => this.detalles.set(d) });
    this.api.observadosLote(loteId).subscribe({ next: (o) => this.observados.set(o) });
  }

  pasarAExcepciones(): void {
    this.pasoActual.set(2);
    // Cargar catálogo del año destino para resolver excepciones
    this.api.listarCatalogo(this.anioFiscal).subscribe({ next: (c) => this.metasCatalogo.set(c) });
  }

  // ===================== PASO 3: Resolver excepciones =====================

  seleccionarExcepcion(det: MetaPptoLoteDet): void {
    this.excepcionSeleccionada.set(det);
    this.metaDestinoResolver.set(null);
  }

  resolverExcepcion(): void {
    const exc = this.excepcionSeleccionada();
    const metaId = this.metaDestinoResolver();
    const loteActual = this.lote();
    if (!exc || !metaId || !loteActual) return;

    this.procesando.set(true);
    this.api
      .resolverExcepcion(loteActual.id, { loteDetId: exc.id, metaDestinoId: metaId })
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.excepcionSeleccionada.set(null);
          this.notif.exito('Excepción resuelta correctamente.');
          this.cargarDetalles(loteActual.id);
          // Refrescar lote
          this.api.listarLotes(this.anioFiscal).subscribe({
            next: (lotes) => {
              const actualizado = lotes.find((l) => l.id === loteActual.id);
              if (actualizado) this.lote.set(actualizado);
              this.lotesPrevios.set(lotes);
            },
          });
        },
        error: (err: HttpErrorResponse) => {
          this.procesando.set(false);
          this.mostrarError(err);
        },
      });
  }

  // ===================== PASO 4: Publicar =====================

  publicar(): void {
    const loteActual = this.lote();
    if (!loteActual || this.procesando()) return;
    this.procesando.set(true);
    this.api.publicarLote(loteActual.id).subscribe({
      next: (lotePub) => {
        this.lote.set(lotePub);
        this.procesando.set(false);
        this.notif.exito('Metas presupuestales publicadas correctamente.');
        this.cargarLotesPrevios();
      },
      error: (err: HttpErrorResponse) => {
        this.procesando.set(false);
        this.mostrarError(err);
      },
    });
  }

  onResuelto(): void {
    const loteActual = this.lote();
    if (loteActual) this.cargarDetalles(loteActual.id);
  }

  exportarActa(): void {
    const dets = this.detalles();
    if (dets.length === 0) return;
    const cabecera = 'DNI;Empleado;Meta Origen;Meta Destino;Estado;Mensaje\n';
    const filas = dets.map(d =>
      [d.empleadoDni ?? '', d.empleadoNombre ?? '', d.metaOrigenCodigo ?? '',
       d.metaDestinoCodigo ?? '', d.estadoValidacion, d.mensajeValidacion ?? '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(';'),
    ).join('\n');
    const blob = new Blob(['﻿' + cabecera + filas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acta-metas-${this.anioFiscal}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  reiniciar(): void {
    this.pasoActual.set(0);
    this.lote.set(null);
    this.detalles.set([]);
    this.observados.set([]);
    this.excepcionSeleccionada.set(null);
    this.observacionLote.set('');
  }

  estadoClass(estado: string): string {
    const mapa: Record<string, string> = {
      OK: 'badge-ok',
      OBSERVADO: 'badge-warn',
      SIN_EQUIVALENCIA: 'badge-warn',
      META_DESTINO_INACTIVA: 'badge-err',
      DUPLICADO: 'badge-err',
      ERROR: 'badge-err',
      EMPLEADO_INACTIVO: 'badge-gray',
    };
    return mapa[estado] ?? 'badge-gray';
  }

  private mostrarError(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
