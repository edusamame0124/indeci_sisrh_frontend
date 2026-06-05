import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmpleadoPlanillaApiService } from '../../services/empleado-planilla-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import type { PlanillaConsolidadaRow } from '../../models/empleado-planilla.model';

/**
 * Pantalla principal de "Configuración planilla": tabla consolidada de TODOS los
 * empleados activos con su régimen/tipo/condición/sueldo. Reemplaza el selector
 * de persona — la acción por fila abre el formulario (Editar o Registrar).
 */
@Component({
  selector: 'app-empleado-planilla-consolidado-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-planilla-consolidado-page.component.html',
  styleUrl: './empleado-planilla-consolidado-page.component.css',
})
export class EmpleadoPlanillaConsolidadoPageComponent implements OnInit {
  private readonly api = inject(EmpleadoPlanillaApiService);
  private readonly errors = inject(ErrorMessageService);

  readonly columns = [
    'empleado',
    'dni',
    'regimen',
    'tipoContrato',
    'condicion',
    'sueldo',
    'estado',
    'acciones',
  ] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly rows = signal<readonly PlanillaConsolidadaRow[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly filterText = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly displayed = computed(() => {
    const q = this.filterText().trim().toLowerCase();
    const list = [...this.rows()];
    list.sort((a, b) => (a.nombreCompleto ?? '').localeCompare(b.nombreCompleto ?? '', 'es-PE'));
    if (!q) return list;
    return list.filter((r) => {
      const blob = `${r.nombreCompleto ?? ''} ${r.dni ?? ''} ${r.codigoInterno ?? ''} ${r.regimenLaboral ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  });

  readonly pagedRows = computed(() => {
    const list = this.displayed();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.reload();
  }

  onFilter(ev: Event): void {
    this.filterText.set((ev.target as HTMLInputElement).value);
    this.pageIndex.set(0);
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  fmtMoney(v: number | null): string {
    if (v == null || Number.isNaN(v)) return '—';
    return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listarConsolidado().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.rows.set([]);
        const body = err.error;
        this.loadError.set(
          isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null),
        );
      },
    });
  }
}
