import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { AsistenciaImportApiService } from '../../services/asistencia-import-api.service';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type {
  AsistenciaImportFilaError,
  AsistenciaImportPreview,
  EstrategiaConflicto,
} from '../../models/asistencia-import.model';

type FiltroPreview = 'TODOS' | AsistenciaImportFilaError['severidad'];

@Component({
  selector: 'app-carga-masiva-csv-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatStepperModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './carga-masiva-csv-page.component.html',
  styleUrl: './carga-masiva-csv-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargaMasivaCsvPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly importApi = inject(AsistenciaImportApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columnasResumen = ['empleado', 'dias', 'tardanza', 'descuento', 'estado', 'conflicto'] as const;
  readonly columnasErrores = ['linea', 'dni', 'fecha', 'severidad', 'mensaje'] as const;
  readonly filtrosPreview: readonly { value: FiltroPreview; label: string }[] = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'VALIDA', label: 'Válidas' },
    { value: 'ERROR', label: 'Errores' },
    { value: 'WARN', label: 'Advertencias' },
    { value: 'OBSERVADA', label: 'Observadas' },
  ];
  readonly estrategias: readonly { value: EstrategiaConflicto; label: string; hint: string }[] = [
    {
      value: 'OMITIR_EXISTENTES',
      label: 'Omitir existentes',
      hint: 'No modifica empleados con asistencia registrada en el periodo.',
    },
    {
      value: 'REEMPLAZAR_EMPLEADOS_ARCHIVO',
      label: 'Reemplazar empleados del archivo',
      hint: 'Actualiza solo los empleados detectados en el CSV.',
    },
    {
      value: 'REEMPLAZAR_PERIODO_COMPLETO',
      label: 'Reemplazar periodo completo',
      hint: 'Reemplaza la asistencia del periodo para todos los empleados validos del archivo.',
    },
    {
      value: 'CANCELAR',
      label: 'Cancelar si hay conflictos',
      hint: 'Detiene la confirmación cuando existe asistencia previa.',
    },
  ];

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly archivo = signal<File | null>(null);
  readonly preview = signal<AsistenciaImportPreview | null>(null);
  readonly estrategia = signal<EstrategiaConflicto>('OMITIR_EXISTENTES');
  readonly filtroPreview = signal<FiltroPreview>('TODOS');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly loadingPeriodos = signal(true);
  readonly procesandoPreview = signal(false);
  readonly confirmando = signal(false);

  readonly tieneErroresBloqueantes = computed(() => (this.preview()?.filasError ?? 0) > 0);
  readonly tieneConflictos = computed(
    () => this.preview()?.empleados.some((e) => e.conflictoExistente) ?? false,
  );
  readonly estrategiaSeleccionada = computed(() =>
    this.estrategias.find((item) => item.value === this.estrategia()) ?? this.estrategias[0],
  );
  readonly filasFiltradas = computed(() => {
    const filas = this.preview()?.errores ?? [];
    const filtro = this.filtroPreview();
    return filtro === 'TODOS' ? filas : filas.filter((fila) => fila.severidad === filtro);
  });
  readonly filasPaginadas = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filasFiltradas().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.limpiarPreview();
  }

  onArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
    this.limpiarPreview();
  }

  generarPreview(): void {
    const periodo = this.periodoSeleccionado();
    const archivo = this.archivo();
    if (periodo == null || archivo == null) {
      this.snack.open('Seleccione periodo y archivo CSV del marcador.', 'Cerrar', { duration: 5000 });
      return;
    }

    this.procesandoPreview.set(true);
    this.importApi.preview(periodo, archivo).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.filtroPreview.set('TODOS');
        this.pageIndex.set(0);
        this.procesandoPreview.set(false);
        this.snack.open(preview.mensaje ?? 'Vista previa generada.', 'Cerrar', { duration: 5000 });
      },
      error: (err: HttpErrorResponse) => {
        this.procesandoPreview.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  confirmar(): void {
    const preview = this.preview();
    if (preview?.importacionId == null || this.tieneErroresBloqueantes()) {
      return;
    }
    this.confirmando.set(true);
    this.importApi.confirmar(preview.importacionId, this.estrategia()).subscribe({
      next: (resultado) => {
        this.confirmando.set(false);
        this.preview.set({ ...preview, mensaje: resultado.mensaje, estadoImportacion: resultado.estadoImportacion });
        this.snack.open(resultado.mensaje ?? 'Importación confirmada.', 'Cerrar', { duration: 6000 });
      },
      error: (err: HttpErrorResponse) => {
        this.confirmando.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  cambiarFiltro(filtro: FiltroPreview): void {
    this.filtroPreview.set(filtro);
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  totalFiltro(filtro: FiltroPreview): number {
    const preview = this.preview();
    if (preview == null) {
      return 0;
    }
    return switchFiltro(filtro, preview);
  }

  badgeLabel(severidad: AsistenciaImportFilaError['severidad']): string {
    switch (severidad) {
      case 'VALIDA':
        return 'Válida';
      case 'WARN':
        return 'Advertencia';
      case 'OBSERVADA':
        return 'Observada';
      case 'ERROR':
        return 'Error';
    }
  }

  private cargarPeriodos(): void {
    this.loadingPeriodos.set(true);
    this.periodoApi.listar().subscribe({
      next: (rows) => {
        const abiertos = rows
          .filter((p) => p.estado === 'ABIERTO')
          .sort((a, b) => b.periodo.localeCompare(a.periodo));
        this.periodos.set(abiertos);
        this.periodoSeleccionado.set(abiertos[0]?.periodo ?? null);
        this.loadingPeriodos.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPeriodos.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private limpiarPreview(): void {
    this.preview.set(null);
    this.filtroPreview.set('TODOS');
    this.pageIndex.set(0);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}

function switchFiltro(filtro: FiltroPreview, preview: AsistenciaImportPreview): number {
  switch (filtro) {
    case 'TODOS':
      return preview.filasTotal;
    case 'VALIDA':
      return preview.filasValidasLimpias;
    case 'WARN':
      return preview.filasAdvertencia;
    case 'OBSERVADA':
      return preview.filasObservadas;
    case 'ERROR':
      return preview.filasError;
  }
}
