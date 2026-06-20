import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MetaPptoApiService } from '../../../../services/meta-ppto-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import type { EmpMetaTrazabilidad, MetaPptoPage, MetaPptoResumen } from '../../../../models/meta-ppto.model';

const ANIO_ACTUAL = new Date().getFullYear();

@Component({
  selector: 'app-trazabilidad-tab',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trazabilidad-tab.component.html',
  styleUrl: './trazabilidad-tab.component.css',
})
export class TrazabilidadTabComponent implements OnInit {
  private readonly api    = inject(MetaPptoApiService);
  private readonly snack  = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly aniosDisponibles = [ANIO_ACTUAL + 1, ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2];

  // Filtros
  readonly anioConsulta  = signal(ANIO_ACTUAL);
  readonly busqueda      = signal('');
  readonly filtroEstado  = signal('');
  readonly filtroCentro  = signal('');

  // Datos
  readonly registros     = signal<EmpMetaTrazabilidad[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages    = signal(0);
  readonly currentPage   = signal(0);
  readonly pageSize      = 25;

  // Estado
  readonly cargando      = signal(false);
  readonly buscado       = signal(false);
  readonly resumen       = signal<MetaPptoResumen | null>(null);

  readonly columnas = [
    'numero', 'empleado', 'dni',
    'metaCodigo', 'centroCosto', 'estado', 'origen',
    'bloqueado', 'creadoEn', 'acciones',
  ] as const;

  ngOnInit(): void {
    this.buscar(0);
  }

  buscar(pagina = 0): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.currentPage.set(pagina);

    const b = this.busqueda()    || undefined;
    const e = this.filtroEstado() || undefined;
    const c = this.filtroCentro() || undefined;

    this.api.trazabilidad(this.anioConsulta(), pagina, this.pageSize, b, e, c).subscribe({
      next: (page: MetaPptoPage<EmpMetaTrazabilidad>) => {
        this.registros.set(page.content);
        this.totalElements.set(page.totalElements);
        this.totalPages.set(page.totalPages);
        this.cargando.set(false);
        this.buscado.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.buscado.set(true);
        this.mostrarError(err);
      },
    });

    // Resumen independiente — falla silenciosamente
    this.api.resumen(this.anioConsulta()).subscribe({
      next: (r) => this.resumen.set(r),
      error: () => {},
    });
  }

  onPage(event: PageEvent): void {
    this.buscar(event.pageIndex);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroEstado.set('');
    this.filtroCentro.set('');
    this.buscar(0);
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      PUBLICADO: 'badge-ok',
      VALIDADO:  'badge-info',
      BORRADOR:  'badge-gray',
      OBSERVADO: 'badge-warn',
      CERRADO:   'badge-gray',
    };
    return map[estado] ?? 'badge-gray';
  }

  origenLabel(origen: string): string {
    const labels: Record<string, string> = {
      MANUAL:              'Manual',
      COPIA_ANIO_ANTERIOR: 'Copia año anterior',
      EQUIVALENCIA:        'Equivalencia',
      IMPORTACION_EXCEL:   'Excel',
      REGULARIZACION:      'Regularización',
      SISTEMA:             'Sistema',
    };
    return labels[origen] ?? origen;
  }

  formatFecha(iso: string | null): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  private mostrarError(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
  }
}
