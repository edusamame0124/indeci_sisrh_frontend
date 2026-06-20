import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, merge, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
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
import type { PersonaResumen } from '../../models/persona-empleado.model';
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
    MatPaginatorModule,
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
  private readonly destroyRef = inject(DestroyRef);

  readonly loadingCatalogos = signal(true);
  readonly loadingEventos = signal(true);
  readonly tipos = signal<readonly TipoEvento[]>([]);
  readonly categoriasLegajo = signal<readonly LegajoCategoria[]>([]);
  readonly eventos = signal<readonly EventoPeriodoResponse[]>([]);
  readonly empleadoFiltro = signal<PersonaResumen | null>(null);
  readonly empleadoOpciones = signal<readonly PersonaResumen[]>([]);
  readonly buscandoEmpleados = signal(false);
  readonly descargandoAdjuntoId = signal<number | null>(null);

  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly totalElements = signal(0);
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly filtroTipo = new FormControl<number | null>(null);
  readonly filtroEstado = new FormControl<EstadoEvento | null>(null);
  readonly empleadoCtrl = new FormControl<string | PersonaResumen>('');

  readonly columnas = [
    'empleado',
    'dni',
    'tipo',
    'periodo',
    'fechas',
    'dias',
    'estado',
    'adjunto',
    'acciones',
  ] as const;

  /** P0-F0: excluye tipos que generan subsidio (flujo en Asistencia → Subsidios). */
  readonly tiposOperativos = computed(() =>
    this.tipos().filter(
      (t) =>
        t.generaSubsidio !== 'S'
        && t.codigo !== 'MATERNIDAD'
        && t.codigo !== 'ENFERMEDAD',
    ),
  );

  ngOnInit(): void {
    this.eventoApi.listarTipos().subscribe({
      next: (t) => {
        this.tipos.set(t);
        this.loadingCatalogos.set(false);
      },
      error: this.onHttpError.bind(this),
    });
    this.legajoApi.listarCategorias().subscribe({
      next: (c) => this.categoriasLegajo.set(c),
      error: this.onHttpError.bind(this),
    });

    merge(this.filtroTipo.valueChanges, this.filtroEstado.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex.set(0);
        this.cargarEventos();
      });

    this.empleadoCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((val) => {
          if (val && typeof val !== 'string') {
            this.buscandoEmpleados.set(false);
            return of([] as readonly PersonaResumen[]);
          }
          const q = typeof val === 'string' ? val.trim() : '';
          if (q.length < 2) {
            this.buscandoEmpleados.set(false);
            return of([] as readonly PersonaResumen[]);
          }
          this.buscandoEmpleados.set(true);
          return this.personaApi.listarPaginado(0, 15, q).pipe(
            map((page) =>
              page.content.filter((p) => p.empleadoId != null),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (opts) => {
          this.empleadoOpciones.set(opts);
          this.buscandoEmpleados.set(false);
        },
        error: () => this.buscandoEmpleados.set(false),
      });

    this.cargarEventos();
  }

  displayEmpleado = (p: PersonaResumen | string | null): string => {
    if (!p || typeof p === 'string') return p ?? '';
    return `${p.nombreCompleto} — DNI ${p.dni ?? ''}`;
  };

  onEmpleadoFiltroSeleccionado(p: PersonaResumen): void {
    this.empleadoFiltro.set(p);
    this.pageIndex.set(0);
    this.cargarEventos();
  }

  limpiarFiltroEmpleado(): void {
    this.empleadoCtrl.setValue('');
    this.empleadoFiltro.set(null);
    this.empleadoOpciones.set([]);
    this.pageIndex.set(0);
    this.cargarEventos();
  }

  onPageChange(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    this.cargarEventos();
  }

  abrirFormCrear(): void {
    this.abrirDialog({
      empleadoId: null,
      tipos: this.tiposOperativos(),
      categoriasLegajo: this.categoriasLegajo(),
      evento: null,
    });
  }

  abrirFormEditar(evento: EventoPeriodoResponse): void {
    this.abrirDialog({
      empleadoId: evento.empleadoId,
      empleadoNombre: evento.empleadoNombre ?? null,
      empleadoDni: evento.empleadoDni ?? null,
      tipos: this.tiposOperativos(),
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

  descargarAdjunto(e: EventoPeriodoResponse): void {
    const docId = e.sustentoLegajoDocId;
    if (docId == null || this.descargandoAdjuntoId() != null) return;

    this.descargandoAdjuntoId.set(docId);
    this.legajoApi.descargar(docId).subscribe({
      next: (res) => {
        this.descargandoAdjuntoId.set(null);
        const blob = res.body;
        if (!blob) {
          this.snack.open(
            'No se recibió el archivo del sustento documental.',
            'Cerrar',
            { duration: 5000 },
          );
          return;
        }
        const nombre =
          this.extraerNombreDescarga(res.headers.get('Content-Disposition'))
          ?? `sustento-${e.tipoEventoCodigo ?? 'evento'}-${e.fechaInicio}.pdf`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        this.descargandoAdjuntoId.set(null);
        this.onHttpError(err);
      },
    });
  }

  eliminar(e: EventoPeriodoResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar evento',
        message: `¿Eliminar el evento "${e.tipoEventoNombre}" de ${e.empleadoNombre ?? 'el empleado'} del ${e.fechaInicio}? Esta acción es lógica y se puede revertir desde la base de datos.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.eventoApi.eliminar(e.id).subscribe({
        next: () => {
          this.snack.open('Evento eliminado', 'Cerrar', { duration: 4000 });
          this.cargarEventos();
        },
        error: this.onHttpError.bind(this),
      });
    });
  }

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

  /** P0-F0: eventos MATERNIDAD/ENFERMEDAD legacy — solo lectura operativa. */
  esEventoSubsidioLegacy(e: EventoPeriodoResponse): boolean {
    return e.generaSubsidio === 'S'
      || e.tipoEventoCodigo === 'MATERNIDAD'
      || e.tipoEventoCodigo === 'ENFERMEDAD';
  }

  private cargarEventos(): void {
    this.loadingEventos.set(true);
    this.eventoApi
      .listarPaginado({
        page: this.pageIndex(),
        size: this.pageSize(),
        empleadoId: this.empleadoFiltro()?.empleadoId ?? null,
        tipoEventoId: this.filtroTipo.value,
        estado: this.filtroEstado.value,
      })
      .subscribe({
        next: (page) => {
          this.eventos.set(page.content);
          this.totalElements.set(page.totalElements);
          this.pageIndex.set(page.pageNumber);
          this.pageSize.set(page.pageSize);
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
      if (res) this.cargarEventos();
    });
  }

  private cambiarEstado(id: number, estado: EstadoEvento, mensaje: string): void {
    this.eventoApi.cambiarEstado(id, estado).subscribe({
      next: () => {
        this.snack.open(mensaje, 'Cerrar', { duration: 4000 });
        this.cargarEventos();
      },
      error: this.onHttpError.bind(this),
    });
  }

  private extraerNombreDescarga(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (utf8?.[1]) {
      try {
        return decodeURIComponent(utf8[1].trim());
      } catch {
        return utf8[1].trim();
      }
    }
    const simple = /filename="?([^";]+)"?/i.exec(contentDisposition);
    return simple?.[1]?.trim() ?? null;
  }

  private onHttpError(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
