import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
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
import { AuthService } from '../../../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { PersonaApiService } from '../../../../../empleados/services/persona-api.service';
import type { PersonaResumen } from '../../../../../empleados/models/persona-empleado.model';
import { SubsidioApiService } from '../../services/subsidio-api.service';
import type { SubsidioCasoResponse, SubsidioEstadoCaso, SubsidioTipoCaso } from '../../models/subsidio.models';
import {
  estadoCasoVariant,
  labelEstadoCaso,
  labelTipoCaso,
  tienePermisoSubsidio,
} from '../../utils/subsidio-calculo-display.utils';
import {
  CrearCasoDialogComponent,
  type CrearCasoDialogResult,
} from './crear-caso-dialog.component';
import {
  SubsidioEliminarDialogComponent,
  type SubsidioEliminarDialogData,
} from './subsidio-eliminar-dialog.component';

const ESTADOS_ELIMINABLES: ReadonlySet<SubsidioEstadoCaso> = new Set([
  'BORRADOR',
  'PENDIENTE_VALIDACION',
  'CALCULADO',
]);

@Component({
  selector: 'app-subsidio-bandeja-casos',
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
  templateUrl: './bandeja-casos.component.html',
  styleUrl: './bandeja-casos.component.css',
})
export class BandejaCasosComponent {
  readonly casoSeleccionado = input<number | null>(null);
  readonly verDetalle = output<number>();

  private readonly api = inject(SubsidioApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly casos = signal<readonly SubsidioCasoResponse[]>([]);
  readonly empleadoFiltro = signal<PersonaResumen | null>(null);
  readonly empleadoOpciones = signal<readonly PersonaResumen[]>([]);
  readonly buscandoEmpleados = signal(false);

  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly totalElements = signal(0);
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly filtroPeriodo = new FormControl<string>('', { nonNullable: true });
  readonly filtroTipo = new FormControl<SubsidioTipoCaso | null>(null);
  readonly filtroEstado = new FormControl<SubsidioEstadoCaso | null>(null);
  readonly empleadoCtrl = new FormControl<string | PersonaResumen>('');

  readonly columnas = [
    'codigo',
    'empleado',
    'tipo',
    'periodo',
    'fechas',
    'estado',
    'acciones',
  ] as const;

  readonly puedeCrear = computed(() =>
    tienePermisoSubsidio(this.auth.permisos(), 'SUB_WRITE'),
  );

  readonly puedeEliminar = computed(() =>
    tienePermisoSubsidio(this.auth.permisos(), 'SUB_WRITE'),
  );

  readonly labelTipo = labelTipoCaso;
  readonly labelEstado = labelEstadoCaso;
  readonly estadoVariant = estadoCasoVariant;

  constructor() {
    merge(
      this.filtroPeriodo.valueChanges,
      this.filtroTipo.valueChanges,
      this.filtroEstado.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex.set(0);
        this.cargarCasos();
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
            map((page) => page.content.filter((p) => p.empleadoId != null)),
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

    this.cargarCasos();
  }

  displayEmpleado = (p: PersonaResumen | string | null): string => {
    if (!p || typeof p === 'string') return p ?? '';
    return `${p.nombreCompleto} — DNI ${p.dni ?? ''}`;
  };

  onEmpleadoFiltroSeleccionado(p: PersonaResumen): void {
    this.empleadoFiltro.set(p);
    this.pageIndex.set(0);
    this.cargarCasos();
  }

  limpiarFiltroEmpleado(): void {
    this.empleadoCtrl.setValue('');
    this.empleadoFiltro.set(null);
    this.empleadoOpciones.set([]);
    this.pageIndex.set(0);
    this.cargarCasos();
  }

  onPageChange(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    this.cargarCasos();
  }

  abrirCrear(): void {
    const ref = this.dialog.open<
      CrearCasoDialogComponent,
      void,
      CrearCasoDialogResult | null
    >(CrearCasoDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      this.snack.open('Caso de subsidio registrado', 'Cerrar', { duration: 4000 });
      this.verDetalle.emit(res.id);
    });
  }

  verCaso(caso: SubsidioCasoResponse): void {
    this.verDetalle.emit(caso.id);
  }

  esEliminable(caso: SubsidioCasoResponse): boolean {
    return this.puedeEliminar() && ESTADOS_ELIMINABLES.has(caso.estado);
  }

  onEliminar(caso: SubsidioCasoResponse): void {
    const ref = this.dialog.open<
      SubsidioEliminarDialogComponent,
      SubsidioEliminarDialogData,
      string | null
    >(SubsidioEliminarDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: { codigoCaso: caso.codigoCaso, nombreEmpleado: caso.nombreEmpleado },
    });
    ref.afterClosed().subscribe((sustento) => {
      if (!sustento) return;
      this.api.eliminarCaso(caso.id, sustento).subscribe({
        next: () => {
          this.snack.open('Caso de subsidio eliminado', 'Cerrar', { duration: 4000 });
          this.cargarCasos();
        },
        error: (err: HttpErrorResponse) => this.onHttpError(err),
      });
    });
  }

  periodoDesdeCaso(caso: SubsidioCasoResponse): string {
    return caso.fechaInicio?.slice(0, 7).replace('-', '') ?? '—';
  }

  private cargarCasos(): void {
    this.loading.set(true);
    const periodo = this.filtroPeriodo.value.trim();
    this.api
      .listarCasos({
        page: this.pageIndex(),
        size: this.pageSize(),
        periodo: periodo.length === 6 ? periodo : null,
        tipo: this.filtroTipo.value,
        estado: this.filtroEstado.value,
        empleadoId: this.empleadoFiltro()?.empleadoId ?? null,
        dni: null,
      })
      .subscribe({
        next: (page) => {
          this.casos.set(page.content);
          this.totalElements.set(page.totalElements);
          this.pageIndex.set(page.page);
          this.pageSize.set(page.size);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.onHttpError(err);
        },
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
