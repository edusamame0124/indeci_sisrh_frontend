import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import type { UbigeoOption } from '../../../empleados/models/ubigeo.model';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-ubigeo-browse-page',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page sisrh-page">
      <nav class="crumbs sisrh-crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__group">Catálogos</span>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">Ubigeo</span>
      </nav>

      <mat-card class="page-card sisrh-elevated">
        <mat-card-header>
          <mat-card-title>Ubigeo (solo lectura)</mat-card-title>
          <mat-card-subtitle>INEI — Departamento, provincia y distrito</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
        <p class="page-hint" role="status">
          Los datos no se modifican desde esta aplicación. Selecciona un departamento y una provincia
          para ver los distritos.
        </p>

        @if (loading()) {
          <div class="page-loading" aria-busy="true">
            <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando ubigeo" />
          </div>
        } @else if (loadError()) {
          <app-empty-state
            variant="error"
            icon="error_outline"
            title="No se pudo cargar la información"
            [description]="loadError()!"
          >
            <button mat-stroked-button type="button" (click)="reload()">Reintentar</button>
          </app-empty-state>
        } @else {
          <div class="cols">
            <section class="col" aria-labelledby="ubigeo-depto-title">
              <h2 class="col-title" id="ubigeo-depto-title">Departamento</h2>
              <mat-form-field appearance="outline" class="filter">
                <mat-label>Filtrar</mat-label>
                <input
                  matInput
                  type="search"
                  [value]="deptoFilter()"
                  (input)="onDeptoFilter($event)"
                  aria-label="Filtrar lista de departamentos"
                />
              </mat-form-field>
              <mat-action-list class="list" role="listbox" aria-label="Lista de departamentos">
                @for (d of departamentosFiltrados(); track d) {
                  <button
                    type="button"
                    mat-list-item
                    role="option"
                    [attr.aria-selected]="d === deptoSeleccionado()"
                    [class.is-active]="d === deptoSeleccionado()"
                    (click)="seleccionarDepto(d)"
                  >
                    {{ d }}
                  </button>
                }
              </mat-action-list>
            </section>

            <section class="col" aria-labelledby="ubigeo-prov-title">
              <h2 class="col-title" id="ubigeo-prov-title">Provincia</h2>
              @if (!deptoSeleccionado()) {
                <app-empty-state
                  icon="map"
                  title="Seleccione un departamento"
                  description="Elija un departamento en la primera columna para ver sus provincias."
                />
              } @else {
                <mat-form-field appearance="outline" class="filter">
                  <mat-label>Filtrar</mat-label>
                  <input
                    matInput
                    type="search"
                    [value]="provFilter()"
                    (input)="onProvFilter($event)"
                    aria-label="Filtrar lista de provincias"
                  />
                </mat-form-field>
                <mat-action-list class="list" role="listbox" aria-label="Lista de provincias">
                  @for (p of provinciasFiltradas(); track p) {
                    <button
                      type="button"
                      mat-list-item
                      role="option"
                      [attr.aria-selected]="p === provSeleccionada()"
                      [class.is-active]="p === provSeleccionada()"
                      (click)="seleccionarProv(p)"
                    >
                      {{ p }}
                    </button>
                  }
                </mat-action-list>
              }
            </section>

            <section class="col col--wide" aria-labelledby="ubigeo-dist-title">
              <h2 class="col-title" id="ubigeo-dist-title">Distritos</h2>
              @if (!deptoSeleccionado() || !provSeleccionada()) {
                <app-empty-state
                  icon="location_on"
                  title="Seleccione departamento y provincia"
                  description="Complete la jerarquía para listar los distritos del ubigeo."
                />
              } @else if (distritosDisplayed().length === 0) {
                <app-empty-state
                  icon="search_off"
                  title="Sin distritos"
                  description="No hay distritos que coincidan con el filtro indicado."
                />
              } @else {
                <mat-form-field appearance="outline" class="filter">
                  <mat-label>Buscar distrito</mat-label>
                  <input
                    matInput
                    type="search"
                    [value]="distritoFilter()"
                    (input)="onDistritoFilter($event)"
                    aria-label="Filtrar distritos por nombre o código"
                  />
                </mat-form-field>
                <div class="sisrh-table-scroll">
                <table mat-table class="tbl" [dataSource]="distritosPaged()">
                  <ng-container matColumnDef="id">
                    <th mat-header-cell *matHeaderCellDef scope="col">Ubigeo</th>
                    <td mat-cell *matCellDef="let row">{{ row.id }}</td>
                  </ng-container>
                  <ng-container matColumnDef="distrito">
                    <th mat-header-cell *matHeaderCellDef scope="col">Distrito</th>
                    <td mat-cell *matCellDef="let row">{{ row.distrito }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="distCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: distCols"></tr>
                </table>
                </div>
                <mat-paginator
                  [length]="distritosDisplayed().length"
                  [pageIndex]="distritoPageIndex()"
                  [pageSize]="distritoPageSize()"
                  [pageSizeOptions]="pageSizeOptions"
                  (page)="onDistritoPage($event)"
                  showFirstLastButtons
                  aria-label="Paginador de distritos ubigeo"
                />
              }
            </section>
          </div>
        }
      </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .cols {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1fr;
      }
      @media (min-width: 960px) {
        .cols {
          grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(260px, 2fr);
        }
      }
      .col-title {
        font-family: var(--sisrh-font-heading);
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.5rem;
        color: var(--sisrh-color-primary);
      }
      .filter {
        width: 100%;
        margin-bottom: 0.5rem;
      }
      .list {
        max-height: 360px;
        overflow: auto;
        border: 1px solid var(--sisrh-border, #e2e8f0);
        border-radius: 0.375rem;
      }
      .is-active {
        background: color-mix(in srgb, var(--sisrh-color-cta, #0369a1) 8%, white);
      }
      .tbl {
        width: 100%;
      }
    `,
  ],
})
export class UbigeoBrowsePageComponent {
  private readonly api = inject(CatalogoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly rows = signal<readonly UbigeoOption[]>([]);

  readonly deptoSeleccionado = signal<string | null>(null);
  readonly provSeleccionada = signal<string | null>(null);

  readonly deptoFilter = signal('');
  readonly provFilter = signal('');
  readonly distritoFilter = signal('');

  readonly distCols = ['id', 'distrito'] as const;

  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly distritoPageIndex = signal(0);
  readonly distritoPageSize = signal(10);
  readonly departamentos = computed(() => {
    const s = new Set<string>();
    for (const r of this.rows()) s.add(r.departamento);
    return [...s].sort((a, b) => a.localeCompare(b, 'es-PE'));
  });

  readonly departamentosFiltrados = computed(() => {
    const f = this.deptoFilter().trim().toLowerCase();
    const d = this.departamentos();
    if (!f) return d;
    return d.filter((x) => x.toLowerCase().includes(f));
  });

  readonly provinciasDelDepto = computed(() => {
    const dept = this.deptoSeleccionado();
    if (!dept) return [] as string[];
    const s = new Set<string>();
    for (const r of this.rows()) {
      if (r.departamento === dept) s.add(r.provincia);
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'es-PE'));
  });

  readonly provinciasFiltradas = computed(() => {
    const f = this.provFilter().trim().toLowerCase();
    const p = this.provinciasDelDepto();
    if (!f) return p;
    return p.filter((x) => x.toLowerCase().includes(f));
  });

  readonly distritosBase = computed(() => {
    const dept = this.deptoSeleccionado();
    const prov = this.provSeleccionada();
    if (!dept || !prov) return [] as UbigeoOption[];
    return this.rows()
      .filter((r) => r.departamento === dept && r.provincia === prov)
      .slice()
      .sort((a, b) => a.distrito.localeCompare(b.distrito, 'es-PE'));
  });

  readonly distritosDisplayed = computed(() => {
    const f = this.distritoFilter().trim().toLowerCase();
    const list = this.distritosBase();
    if (!f) return list;
    return list.filter(
      (r) =>
        r.distrito.toLowerCase().includes(f) ||
        r.id.toLowerCase().includes(f),
    );
  });

  readonly distritosPaged = computed(() => {
    const list = this.distritosDisplayed();
    const start = this.distritoPageIndex() * this.distritoPageSize();
    return list.slice(start, start + this.distritoPageSize());
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listarUbigeo().subscribe({
      next: (data) => {
        this.rows.set(data);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.rows.set([]);
        this.loadError.set(this.resolveError(err));
      },
    });
  }

  onDeptoFilter(ev: Event): void {
    this.deptoFilter.set((ev.target as HTMLInputElement).value);
  }

  onProvFilter(ev: Event): void {
    this.provFilter.set((ev.target as HTMLInputElement).value);
  }

  onDistritoFilter(ev: Event): void {
    this.distritoFilter.set((ev.target as HTMLInputElement).value);
    this.distritoPageIndex.set(0);
  }

  onDistritoPage(ev: PageEvent): void {
    this.distritoPageIndex.set(ev.pageIndex);
    this.distritoPageSize.set(ev.pageSize);
  }

  seleccionarDepto(d: string): void {
    this.deptoSeleccionado.set(d);
    this.provSeleccionada.set(null);
    this.provFilter.set('');
    this.distritoFilter.set('');
    this.distritoPageIndex.set(0);
  }

  seleccionarProv(p: string): void {
    this.provSeleccionada.set(p);
    this.distritoFilter.set('');
    this.distritoPageIndex.set(0);
  }

  private resolveError(err: unknown): string {
    if (err instanceof HttpErrorResponse && isErrorResponse(err.error)) {
      return this.errors.translate(err.error.mensaje);
    }
    return this.errors.translate(null);
  }
}
