import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';

/** Fila genérica de catálogo (cada wrapper especializa el tipo). */
export type CatalogoRow = Readonly<Record<string, unknown>>;

/** Definición de una columna de tabla de catálogo. */
export interface CatalogoColumn {
  /** Propiedad del row a renderizar. */
  readonly key: string;
  /** Encabezado mostrado en la tabla. */
  readonly label: string;
  /** Formateo opcional del valor. Útil para mapear códigos a etiquetas legibles. */
  readonly formatter?: (value: unknown, row: CatalogoRow) => string;
}

/** Configuración para una página de catálogo de solo lectura. */
export interface CatalogoReadonlyConfig {
  readonly titulo: string;
  readonly subtitulo?: string;
  /**
   * Lista tipada del backend; se normaliza a {@link CatalogoRow} en `loadRows` (único cast).
   */
  readonly fetchFn: () => Observable<readonly unknown[]>;
  readonly columnas: readonly CatalogoColumn[];
  /** Propiedades sobre las que aplicar el filtro de búsqueda local (case-insensitive). */
  readonly searchKeys: readonly string[];
  readonly emptyMessage?: string;
}

/**
 * Componente base para páginas de catálogo de solo lectura (Spec 009 — Módulo 1).
 * Se utiliza envuelto por wrappers triviales que aportan el `CatalogoReadonlyConfig`.
 */
@Component({
  selector: 'app-catalogo-readonly-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo-readonly-page.component.html',
  styleUrl: './catalogo-readonly-page.component.css',
})
export class CatalogoReadonlyPageComponent implements OnInit {
  private readonly errors = inject(ErrorMessageService);

  /**
   * Configuración inyectada por el wrapper. Bindeable por `[config]` desde el template.
   * Se expone también como signal `effectiveConfig` para reactividad si el wrapper
   * la actualiza posteriormente.
   */
  @Input({ required: true }) set config(value: CatalogoReadonlyConfig) {
    this.configSignal.set(value);
  }

  readonly pageSizeOptions = [10, 25, 50, 100] as const;

  private readonly configSignal = signal<CatalogoReadonlyConfig | null>(null);
  readonly effectiveConfig = computed(() => {
    const c = this.configSignal();
    if (!c) {
      throw new Error('CatalogoReadonlyPageComponent: falta @Input config');
    }
    return c;
  });

  readonly rows = signal<readonly CatalogoRow[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(25);

  readonly columnKeys = computed(() => this.effectiveConfig().columnas.map((c) => c.key));

  readonly filteredRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    const keys = this.effectiveConfig().searchKeys;
    return list.filter((row) =>
      keys.some((k) => {
        const v = row[k];
        if (v == null) return false;
        return String(v).toLowerCase().includes(q);
      }),
    );
  });

  readonly pagedRows = computed(() => {
    const list = this.filteredRows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadRows();
  }

  retryLoad(): void {
    this.loadRows();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchQuery.set(target?.value ?? '');
    this.pageIndex.set(0);
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  formatCell(row: CatalogoRow, col: CatalogoColumn): string {
    const raw = row[col.key];
    if (col.formatter) return col.formatter(raw, row);
    if (raw == null) return '—';
    return String(raw);
  }

  private loadRows(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.effectiveConfig()
      .fetchFn()
      .subscribe({
        next: (list) => {
          this.rows.set(list as readonly CatalogoRow[]);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          const body = err.error;
          const msg = isErrorResponse(body)
            ? this.errors.translate(body.mensaje)
            : this.errors.translate(null);
          this.errorMessage.set(msg);
        },
      });
  }
}
