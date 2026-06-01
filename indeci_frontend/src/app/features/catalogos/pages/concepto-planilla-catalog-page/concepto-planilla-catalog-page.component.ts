import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { sisrhConfirmDialogConfig, sisrhFormDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { hasCatalogosWrite } from '../../../../core/guards/catalogos-access.guard';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ClientTelemetryService } from '../../../../core/services/client-telemetry.service';
import { ConceptoPlanillaApiService } from '../../services/concepto-planilla-api.service';
import {
  ConceptoPlanillaFormDialogComponent,
  type ConceptoPlanillaFormDialogData,
} from '../../components/concepto-planilla-form-dialog/concepto-planilla-form-dialog.component';
import type { ConceptoPlanillaInput, ConceptoPlanillaRow } from '../../models/concepto-planilla.model';

@Component({
  selector: 'app-concepto-planilla-catalog-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatChipsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './concepto-planilla-catalog-page.component.html',
  styleUrl: './concepto-planilla-catalog-page.component.css',
})
export class ConceptoPlanillaCatalogPageComponent {
  private readonly api = inject(ConceptoPlanillaApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);
  private readonly auth = inject(AuthService);

  readonly canWrite = computed(() => hasCatalogosWrite([...this.auth.roles()]));

  /** Columnas base (sin acciones). F3.2 — tabla enriquecida con chips. */
  private static readonly baseCols = [
    'codigo',
    'nombre',
    'tipoConcepto',
    'afectaciones',
    'regimen',
    'activo',
  ] as const;

  readonly displayCols = computed(() =>
    this.canWrite()
      ? [...ConceptoPlanillaCatalogPageComponent.baseCols, 'acciones']
      : [...ConceptoPlanillaCatalogPageComponent.baseCols],
  );

  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly rows = signal<readonly ConceptoPlanillaRow[]>([]);
  readonly filterText = signal('');

  // F3.2 — filtros adicionales por chips visuales.
  readonly filtroTipoConcepto = signal<string>('TODOS');
  readonly filtroRegimen = signal<string>('TODOS');
  readonly filtroProrrateable = signal<string>('TODOS');

  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly displayed = computed(() => {
    const q = this.filterText().trim().toLowerCase();
    const tipo = this.filtroTipoConcepto();
    const reg = this.filtroRegimen();
    const pro = this.filtroProrrateable();

    return this.rows().filter((r) => {
      // Texto libre: código, nombre, naturaleza, MEF, SISPER, PLAME, MCPP.
      if (q) {
        const hay =
          r.codigo.toLowerCase().includes(q) ||
          r.nombre.toLowerCase().includes(q) ||
          r.naturaleza.toLowerCase().includes(q) ||
          (r.codigoMef ?? '').toLowerCase().includes(q) ||
          (r.codigoSisper ?? '').toLowerCase().includes(q) ||
          (r.codigoPlameSunat ?? '').toLowerCase().includes(q) ||
          (r.codigoMcpp ?? '').toLowerCase().includes(q);
        if (!hay) return false;
      }
      if (tipo !== 'TODOS') {
        if ((r.tipoConcepto ?? '') !== tipo) return false;
      }
      if (reg !== 'TODOS') {
        const tokens = (r.regimenAplicable ?? 'TODOS')
          .toUpperCase()
          .split(',')
          .map((t) => t.trim());
        if (!tokens.includes(reg) && !tokens.includes('TODOS')) return false;
      }
      if (pro !== 'TODOS') {
        const isPro = (r.esProrrateable ?? 'N').toUpperCase() === 'S';
        if (pro === 'SI' && !isPro) return false;
        if (pro === 'NO' && isPro) return false;
      }
      return true;
    });
  });

  readonly pagedDisplayed = computed(() => {
    const list = this.displayed();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  constructor() {
    this.reload();
  }

  labelTipo(t: string): string {
    return t === 'INGRESO' ? 'Ingreso' : 'Descuento';
  }

  labelActivo(v: number): string {
    return v === 1 ? 'Sí' : 'No';
  }

  /** Label corto del TIPO_CONCEPTO MEF para chip. */
  labelTipoConcepto(t: string | null | undefined): string {
    switch (t) {
      case 'REMUNERATIVO': return 'Remunerativo';
      case 'NO_REMUNERATIVO': return 'No remunerativo';
      case 'DESCUENTO': return 'Descuento';
      case 'APORTE_TRABAJADOR': return 'Aporte trabajador';
      case 'APORTE_EMPLEADOR': return 'Aporte empleador';
      default: return '—';
    }
  }

  /** Severidad de chip para TIPO_CONCEPTO (color institucional). */
  severityTipoConcepto(t: string | null | undefined): 'success' | 'warning' | 'info' | 'neutral' {
    switch (t) {
      case 'REMUNERATIVO': return 'success';
      case 'NO_REMUNERATIVO': return 'info';
      case 'DESCUENTO':
      case 'APORTE_TRABAJADOR':
        return 'warning';
      case 'APORTE_EMPLEADOR':
        return 'info';
      default:
        return 'neutral';
    }
  }

  /** Tokens del régimen aplicable, para renderizar 1 chip por token. */
  regimenTokens(value: string | null | undefined): readonly string[] {
    if (!value || value.trim() === '' || value.toUpperCase() === 'TODOS') {
      return ['TODOS'];
    }
    return value
      .toUpperCase()
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  /** S/N → boolean para mostrar chip. */
  isOn(v: string | null | undefined): boolean {
    return (v ?? 'N').toUpperCase() === 'S';
  }

  onFilter(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.filterText.set(v);
    this.pageIndex.set(0);
  }

  setFiltroTipo(v: string): void {
    this.filtroTipoConcepto.set(v);
    this.pageIndex.set(0);
  }

  setFiltroRegimen(v: string): void {
    this.filtroRegimen.set(v);
    this.pageIndex.set(0);
  }

  setFiltroProrrateable(v: string): void {
    this.filtroProrrateable.set(v);
    this.pageIndex.set(0);
  }

  limpiarFiltros(): void {
    this.filterText.set('');
    this.filtroTipoConcepto.set('TODOS');
    this.filtroRegimen.set('TODOS');
    this.filtroProrrateable.set('TODOS');
    this.pageIndex.set(0);
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  openCreate(): void {
    if (!this.canWrite()) return;
    this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action: 'CONCEPTO_CREATE_OPEN' } });
    const data: ConceptoPlanillaFormDialogData = {
      title: 'Nuevo concepto de planilla',
      submitLabel: 'Registrar',
      initial: null,
    };
    const ref = this.dialog.open(ConceptoPlanillaFormDialogComponent, sisrhFormDialogConfig('md', { data }));
    ref.afterClosed().subscribe((body: ConceptoPlanillaInput | undefined) => {
      if (!body) return;
      this.api.guardar(body).subscribe({
        next: () => {
          this.snack.open('Concepto registrado correctamente.', 'Cerrar', { duration: 4000 });
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'CONCEPTO_CREATE_FAIL'),
      });
    });
  }

  openEdit(row: ConceptoPlanillaRow): void {
    if (!this.canWrite()) return;
    this.telemetry.track('CATALOG_ADMIN_UI', {
      extra: { action: 'CONCEPTO_EDIT_OPEN', id: row.id },
    });
    const initial: ConceptoPlanillaInput = {
      codigo: row.codigo,
      nombre: row.nombre,
      tipo: row.tipo,
      naturaleza: row.naturaleza,
    };
    const data: ConceptoPlanillaFormDialogData = {
      title: 'Editar concepto de planilla',
      submitLabel: 'Guardar cambios',
      initial,
    };
    const ref = this.dialog.open(ConceptoPlanillaFormDialogComponent, sisrhFormDialogConfig('md', { data }));
    ref.afterClosed().subscribe((body: ConceptoPlanillaInput | undefined) => {
      if (!body) return;
      this.api.actualizar(row.id, body).subscribe({
        next: () => {
          this.snack.open('Concepto actualizado correctamente.', 'Cerrar', { duration: 4000 });
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'CONCEPTO_EDIT_FAIL'),
      });
    });
  }

  confirmDelete(row: ConceptoPlanillaRow): void {
    if (!this.canWrite()) return;
    const ref = this.dialog.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Eliminar concepto',
        message: `¿Confirmas la baja del concepto "${row.nombre}" (${row.codigo})?`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (!ok) return;
      this.api.eliminar(row.id).subscribe({
        next: () => {
          this.snack.open('Concepto dado de baja correctamente.', 'Cerrar', { duration: 4000 });
          this.reload();
        },
        error: (e: unknown) => this.handleWriteError(e, 'CONCEPTO_DELETE_FAIL'),
      });
    });
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listar().subscribe({
      next: (list) => {
        this.rows.set(list);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.rows.set([]);
        this.loadError.set(this.resolveLoadError(e));
        this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action: 'CONCEPTO_LOAD_FAIL' } });
      },
    });
  }

  private resolveLoadError(err: unknown): string {
    if (err instanceof HttpErrorResponse && isErrorResponse(err.error)) {
      return this.errors.translate(err.error.mensaje);
    }
    return this.errors.translate(null);
  }

  private handleWriteError(err: unknown, action: string): void {
    this.telemetry.track('CATALOG_ADMIN_UI', { extra: { action } });
    if (this.isWriteUnavailable(err)) {
      this.snack.open(this.errors.catalogosEscrituraNoDisponible(), 'Cerrar', { duration: 8000 });
      return;
    }
    if (err instanceof HttpErrorResponse && isErrorResponse(err.error)) {
      this.snack.open(this.errors.translate(err.error.mensaje), 'Cerrar', { duration: 6000 });
      return;
    }
    this.snack.open(this.errors.translate(null), 'Cerrar', { duration: 6000 });
  }

  private isWriteUnavailable(err: unknown): boolean {
    return err instanceof HttpErrorResponse && [404, 405, 501].includes(err.status);
  }
}
