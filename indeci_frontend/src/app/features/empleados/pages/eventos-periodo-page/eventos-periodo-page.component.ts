import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { startWith, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { PersonaApiService } from '../../services/persona-api.service';
import { EventoPeriodoApiService } from '../../services/evento-periodo-api.service';
import { LegajoDocumentoApiService } from '../../services/legajo-documento-api.service';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';
import type {
  EstadoEvento,
  EventoPeriodoResponse,
  TipoEvento,
} from '../../models/evento-periodo.model';
import type { LegajoCategoria } from '../../models/legajo-documento.model';
import {
  EventoPeriodoFormDialogComponent,
  type EventoPeriodoDialogData,
} from './evento-periodo-form-dialog.component';

/**
 * F3.6c — Página de Eventos del Período del empleado.
 *
 * <p>Flujo:</p>
 * <ol>
 *   <li>Carga al inicio: catálogo de tipos + categorías de legajo + lista de
 *       empleados (autocomplete).</li>
 *   <li>Usuario selecciona empleado → se cargan sus eventos.</li>
 *   <li>"Registrar evento" abre {@link EventoPeriodoFormDialogComponent}.</li>
 *   <li>Acciones por fila: validar / rechazar / eliminar (baja lógica).</li>
 * </ol>
 *
 * <p>Ruta: {@code /empleados/eventos}.</p>
 */
@Component({
  selector: 'app-eventos-periodo-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './eventos-periodo-page.component.html',
  styleUrl: './eventos-periodo-page.component.css',
})
export class EventosPeriodoPageComponent implements OnInit {
  private readonly personaApi = inject(PersonaApiService);
  private readonly eventoApi = inject(EventoPeriodoApiService);
  private readonly legajoApi = inject(LegajoDocumentoApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  // ----- State -----
  readonly loadingCatalogos = signal(true);
  readonly loadingEventos = signal(false);
  readonly personas = signal<readonly PersonaEmpleado[]>([]);
  readonly tipos = signal<readonly TipoEvento[]>([]);
  readonly categoriasLegajo = signal<readonly LegajoCategoria[]>([]);
  readonly eventos = signal<readonly EventoPeriodoResponse[]>([]);
  readonly empleadoSeleccionado = signal<PersonaEmpleado | null>(null);

  // Filtros para la tabla.
  readonly filtroTipo = new FormControl<number | null>(null);
  readonly filtroEstado = new FormControl<EstadoEvento | null>(null);

  // Selector empleado autocomplete.
  readonly empleadoCtrl = new FormControl<string | PersonaEmpleado>('');
  readonly empleadosFiltrados = toSignal(
    this.empleadoCtrl.valueChanges.pipe(
      startWith(''),
      map((val) => {
        const q = typeof val === 'string' ? val.toLowerCase() : '';
        if (!q) return this.personas();
        return this.personas().filter(
          (p) =>
            p.nombreCompleto?.toLowerCase().includes(q) ||
            p.dni?.includes(q),
        );
      }),
    ),
    { initialValue: [] as readonly PersonaEmpleado[] },
  );

  readonly columnas = ['tipo', 'periodo', 'fechas', 'dias', 'estado', 'adjunto', 'acciones'];

  readonly eventosFiltrados = computed(() => {
    const tipo = this.filtroTipo.value;
    const estado = this.filtroEstado.value;
    return this.eventos().filter((e) => {
      if (tipo != null && e.tipoEventoId !== tipo) return false;
      if (estado && e.estado !== estado) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.eventoApi.listarTipos().subscribe({
      next: (t) => this.tipos.set(t),
      error: this.onHttpError.bind(this),
    });
    this.legajoApi.listarCategorias().subscribe({
      next: (c) => this.categoriasLegajo.set(c),
      error: this.onHttpError.bind(this),
    });
    this.personaApi.listar().subscribe({
      next: (p) => {
        // Solo personas con empleadoId vinculado.
        this.personas.set(p.filter((per) => per.empleadoId != null));
        this.loadingCatalogos.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCatalogos.set(false);
        this.onHttpError(err);
      },
    });
  }

  // ====================== Acciones ======================

  displayEmpleado = (p: PersonaEmpleado | string | null): string => {
    if (!p || typeof p === 'string') return '';
    return `${p.nombreCompleto} — DNI ${p.dni}`;
  };

  onEmpleadoSeleccionado(p: PersonaEmpleado): void {
    this.empleadoSeleccionado.set(p);
    this.cargarEventos(p.empleadoId!);
  }

  abrirFormCrear(): void {
    const emp = this.empleadoSeleccionado();
    if (!emp || emp.empleadoId == null) return;
    this.abrirDialog({
      empleadoId: emp.empleadoId,
      tipos: this.tipos(),
      categoriasLegajo: this.categoriasLegajo(),
      evento: null,
    });
  }

  abrirFormEditar(evento: EventoPeriodoResponse): void {
    const emp = this.empleadoSeleccionado();
    if (!emp || emp.empleadoId == null) return;
    this.abrirDialog({
      empleadoId: emp.empleadoId,
      tipos: this.tipos(),
      categoriasLegajo: this.categoriasLegajo(),
      evento,
    });
  }

  validar(e: EventoPeriodoResponse): void {
    this.cambiarEstado(e.id, 'VALIDADO', 'Evento validado.');
  }

  rechazar(e: EventoPeriodoResponse): void {
    this.cambiarEstado(e.id, 'RECHAZADO', 'Evento rechazado.');
  }

  eliminar(e: EventoPeriodoResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar evento',
        message: `¿Eliminar el evento "${e.tipoEventoNombre}" del ${e.fechaInicio}? Esta acción es lógica y se puede revertir desde la base de datos.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.eventoApi.eliminar(e.id).subscribe({
        next: () => {
          this.snack.open('Evento eliminado', 'Cerrar', { duration: 4000 });
          if (this.empleadoSeleccionado()?.empleadoId)
            this.cargarEventos(this.empleadoSeleccionado()!.empleadoId!);
        },
        error: this.onHttpError.bind(this),
      });
    });
  }

  /** Severidad visual del badge de estado. */
  estadoColor(estado: EstadoEvento): 'success' | 'warning' | 'danger' {
    return estado === 'VALIDADO'
      ? 'success'
      : estado === 'RECHAZADO'
        ? 'danger'
        : 'warning';
  }

  estadoIcon(estado: EstadoEvento): string {
    return estado === 'VALIDADO'
      ? 'check_circle'
      : estado === 'RECHAZADO'
        ? 'cancel'
        : 'pending';
  }

  // ====================== Helpers ======================

  private cargarEventos(empleadoId: number): void {
    this.loadingEventos.set(true);
    this.eventoApi.listarPorEmpleado(empleadoId).subscribe({
      next: (e) => {
        this.eventos.set(e);
        this.loadingEventos.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingEventos.set(false);
        this.onHttpError(err);
      },
    });
  }

  private abrirDialog(data: EventoPeriodoDialogData): void {
    const ref = this.dialog.open<
      EventoPeriodoFormDialogComponent,
      EventoPeriodoDialogData,
      EventoPeriodoResponse | null
    >(EventoPeriodoFormDialogComponent, {
      data,
      width: '720px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((res) => {
      if (res && this.empleadoSeleccionado()?.empleadoId) {
        this.cargarEventos(this.empleadoSeleccionado()!.empleadoId!);
      }
    });
  }

  private cambiarEstado(id: number, estado: EstadoEvento, mensaje: string): void {
    this.eventoApi.cambiarEstado(id, estado).subscribe({
      next: () => {
        this.snack.open(mensaje, 'Cerrar', { duration: 4000 });
        if (this.empleadoSeleccionado()?.empleadoId)
          this.cargarEventos(this.empleadoSeleccionado()!.empleadoId!);
      },
      error: this.onHttpError.bind(this),
    });
  }

  private onHttpError(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
