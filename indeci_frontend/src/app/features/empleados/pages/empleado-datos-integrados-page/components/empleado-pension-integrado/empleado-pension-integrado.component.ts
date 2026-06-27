import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EmpleadoPensionApiService } from '../../../../services/empleado-pension-api.service';
import { CatalogoApiService } from '../../../../services/catalogo-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { sisrhConfirmDialogConfig } from '../../../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../../../shared/components/empty-state/empty-state.component';
import type { EmpleadoPensionRow, CondicionEspecialAfp, TasasVigentesPension, EmpleadoPensionInput } from '../../../../models/empleado-pension.model';
import type { RegimenPensionarioCatalogItem, TipoComisionAfpCatalogItem } from '../../../../models/catalog-item.model';

const CUSPP_PATTERN = /^[A-Z0-9]{12}$/;
const CUSPP_INVALID_CHARS = /[^A-Z0-9]/g;

function toPercent(fraction: number | null): number | null {
  if (fraction == null) return null;
  return Math.round(fraction * 10000) / 100;
}

@Component({
  selector: 'app-empleado-pension-integrado',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-pension-integrado.component.html',
  styles: `
    :host {
      display: block;
      font-family: var(--sisrh-font-sans, sans-serif);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    @media (max-width: 720px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    .full {
      grid-column: 1 / -1;
    }
    .half {
      width: 100%;
    }
    .actions {
      margin-top: 1rem;
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    .tbl {
      width: 100%;
    }
    .form-container {
      background-color: #f8fafc;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      border: 1px solid #e2e8f0;
    }
    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .form-title {
      font-weight: 600;
      font-size: 1.1rem;
      color: #0f172a;
      margin: 0;
    }
    .onp-info {
      grid-column: 1 / -1;
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
    }
    .tasas-block {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 0.75rem;
    }
    .tasas-block__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .tasas-block__title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      color: #334155;
    }
    .hint {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    .warn {
      color: #9a3412;
      background: #fff7ed;
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
    }
  `,
})
export class EmpleadoPensionIntegradoComponent implements OnInit {
  readonly empleadoId = input.required<number>();
  readonly personaId = input.required<number>();
  readonly hasRecord = output<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly pensionApi = inject(EmpleadoPensionApiService);
  private readonly catalogo = inject(CatalogoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly dialogs = inject(MatDialog);

  readonly isEdit = signal(false);
  readonly editingPensionId = signal<number | null>(null);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);
  readonly showForm = signal(false);

  readonly regimenes = signal<readonly RegimenPensionarioCatalogItem[]>([]);
  readonly tiposComision = signal<readonly TipoComisionAfpCatalogItem[]>([]);
  
  readonly form = this.fb.group({
    regimenPensionarioId: this.fb.control<number | null>(null, Validators.required),
    cuspp: this.fb.nonNullable.control<string>(''),
    tipoComisionAfpId: this.fb.control<number | null>(null),
    porcentajeAporte: this.fb.control<number | null>(null),
    porcentajeComision: this.fb.control<number | null>(null),
    porcentajeSeguro: this.fb.control<number | null>(null),
  });

  readonly tipoRegimenSeleccionado = signal<string | null>(null);
  readonly esAfp = computed(() => this.tipoRegimenSeleccionado() === 'AFP');
  readonly esOnp = computed(() => this.tipoRegimenSeleccionado() === 'ONP');

  readonly tasasVigentes = signal<TasasVigentesPension | null>(null);
  readonly tasasLoading = signal(false);
  readonly tasasError = signal(false);
  readonly personalizarTasas = signal(false);

  readonly condicionEspecialAfp = signal<CondicionEspecialAfp | null>(null);
  readonly fechaCondicionAfp = signal<string | null>(null);
  readonly observacionCondicionAfp = signal<string | null>(null);

  readonly rows = signal<readonly EmpleadoPensionRow[]>([]);
  readonly tableLoading = signal(false);
  readonly tableLoadError = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly columns = ['tipoRegimen', 'regimen', 'cuspp', 'comision', 'aporte', 'acciones'] as const;

  readonly pagedRows = computed(() => {
    const list = this.rows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  constructor() {
    this.form.controls.regimenPensionarioId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.onRegimenChange(id));

    this.form.controls.tipoComisionAfpId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.esAfp()) this.fetchTasas();
      });
  }

  ngOnInit(): void {
    if (this.empleadoId() < 1) {
      this.pageLoading.set(false);
      return;
    }

    forkJoin({
      regimenes: this.catalogo.listarRegimenesPensionarios(),
      tiposComision: this.catalogo.listarTiposComisionAfp(),
    }).subscribe({
      next: ({ regimenes, tiposComision }) => {
        this.regimenes.set(regimenes);
        this.tiposComision.set(tiposComision);
        this.loadList();
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.pageLoading.set(false);
        this.onHttpSnack(err);
      }
    });
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  fmtPct(value: number | null): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `${value}%`;
  }

  private loadList(): void {
    this.tableLoading.set(true);
    this.tableLoadError.set(null);
    this.pensionApi.listar(this.empleadoId()).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.hasRecord.emit(list.length > 0);
        this.clampPageIndex(list.length);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.rows.set([]);
        this.tableLoadError.set(this.translateHttpError(err));
      },
    });
  }

  private translateHttpError(err: HttpErrorResponse): string {
    const body = err.error;
    return isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
  }

  private clampPageIndex(total: number): void {
    const ps = this.pageSize();
    const maxIdx = total > 0 ? Math.max(0, Math.ceil(total / ps) - 1) : 0;
    if (this.pageIndex() > maxIdx) this.pageIndex.set(maxIdx);
  }

  iniciarNuevaPension(): void {
    this.form.reset({
      cuspp: '',
    });
    this.condicionEspecialAfp.set(null);
    this.fechaCondicionAfp.set(null);
    this.observacionCondicionAfp.set(null);
    this.isEdit.set(false);
    this.editingPensionId.set(null);
    this.showForm.set(true);
  }

  editarPension(row: EmpleadoPensionRow): void {
    this.isEdit.set(true);
    this.editingPensionId.set(row.id);
    this.showForm.set(true);
    
    this.condicionEspecialAfp.set(row.condicionEspecialAfp);
    this.fechaCondicionAfp.set(row.fechaCondicionAfp);
    this.observacionCondicionAfp.set(row.observacionCondicionAfp);
    
    this.form.patchValue(
      {
        regimenPensionarioId: row.regimenPensionarioId,
        cuspp: row.cuspp ?? '',
        tipoComisionAfpId: row.tipoComisionAfpId,
        porcentajeAporte: row.porcentajeAporte,
        porcentajeComision: row.porcentajeComision,
        porcentajeSeguro: row.porcentajeSeguro,
      },
      { emitEvent: false },
    );
    this.onRegimenChange(row.regimenPensionarioId, { skipFetch: true });
    if (this.esAfp()) this.fetchTasas({ skipFormPatch: true });
  }

  cancelarForm(): void {
    this.showForm.set(false);
  }

  confirmEliminar(row: EmpleadoPensionRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Desactivar pensión',
        message: `Se desactivará el registro de pensión (${row.regimenPensionario || row.tipoRegimen}). ¿Continuar?`,
        confirmLabel: 'Desactivar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.eliminar(row.id);
    });
  }

  private eliminar(id: number): void {
    this.pensionApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Pensión desactivada correctamente.', 'Cerrar', { duration: 4000 });
        this.loadList();
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  private onRegimenChange(id: number | null, opts: { skipFetch?: boolean } = {}): void {
    const regimen = id != null ? this.regimenes().find((r) => r.id === id) : undefined;
    const tipo = regimen?.tipo?.trim().toUpperCase() ?? null;
    this.tipoRegimenSeleccionado.set(tipo);

    const cusppCtrl = this.form.controls.cuspp;
    const tipoComisionCtrl = this.form.controls.tipoComisionAfpId;
    const pctCtrls = [
      this.form.controls.porcentajeAporte,
      this.form.controls.porcentajeComision,
      this.form.controls.porcentajeSeguro,
    ];

    if (tipo === 'AFP') {
      cusppCtrl.setValidators([Validators.required, Validators.pattern(CUSPP_PATTERN)]);
      tipoComisionCtrl.setValidators([Validators.required, Validators.min(1)]);
      this.personalizarTasas.set(false);
      for (const c of pctCtrls) c.disable({ emitEvent: false });
      if (!opts.skipFetch) this.fetchTasas();
    } else {
      cusppCtrl.clearValidators();
      tipoComisionCtrl.clearValidators();
      tipoComisionCtrl.setValue(null, { emitEvent: false });
      for (const c of pctCtrls) {
        c.setValue(null, { emitEvent: false });
        c.disable({ emitEvent: false });
      }
      this.tasasVigentes.set(null);
      this.tasasError.set(false);
    }
    cusppCtrl.updateValueAndValidity({ emitEvent: false });
    tipoComisionCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private fetchTasas(opts: { skipFormPatch?: boolean } = {}): void {
    const regimenId = this.form.controls.regimenPensionarioId.value;
    if (regimenId == null) {
      this.tasasVigentes.set(null);
      return;
    }
    const tipoId = this.esAfp() ? this.form.controls.tipoComisionAfpId.value : null;
    this.tasasLoading.set(true);
    this.tasasError.set(false);
    this.pensionApi.obtenerTasasVigentes(regimenId, tipoId).subscribe({
      next: (t) => {
        this.tasasVigentes.set(t);
        this.tasasLoading.set(false);
        if (!opts.skipFormPatch && !this.personalizarTasas()) {
          this.form.patchValue(
            {
              porcentajeAporte: toPercent(t.aporte),
              porcentajeComision: toPercent(t.comision),
              porcentajeSeguro: toPercent(t.prima),
            },
            { emitEvent: false },
          );
        }
      },
      error: () => {
        this.tasasLoading.set(false);
        this.tasasError.set(true);
      },
    });
  }

  togglePersonalizar(): void {
    const next = !this.personalizarTasas();
    this.personalizarTasas.set(next);
    const pctCtrls = [
      this.form.controls.porcentajeAporte,
      this.form.controls.porcentajeComision,
      this.form.controls.porcentajeSeguro,
    ];
    if (next) {
      for (const c of pctCtrls) c.enable({ emitEvent: false });
    } else {
      for (const c of pctCtrls) c.disable({ emitEvent: false });
      const t = this.tasasVigentes();
      if (t) {
        this.form.patchValue(
          {
            porcentajeAporte: toPercent(t.aporte),
            porcentajeComision: toPercent(t.comision),
            porcentajeSeguro: toPercent(t.prima),
          },
          { emitEvent: false },
        );
      }
    }
  }

  onCusppInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const cleaned = input.value
      .toUpperCase()
      .replace(CUSPP_INVALID_CHARS, '')
      .slice(0, 12);
    if (input.value !== cleaned) {
      this.form.controls.cuspp.setValue(cleaned);
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const empId = this.empleadoId();
    const regimenId = v.regimenPensionarioId;
    if (empId < 1 || regimenId == null) return;

    const regimen = this.regimenes().find((r) => r.id === regimenId);
    const tipoRegimen = regimen?.tipo?.trim().toUpperCase() ?? '';
    const esAfp = tipoRegimen === 'AFP';

    const body: EmpleadoPensionInput = {
      empleadoId: empId,
      regimenPensionarioId: regimenId,
      cuspp: v.cuspp.trim(),
      porcentajeAporte: v.porcentajeAporte,
      porcentajeComision: v.porcentajeComision,
      porcentajeSeguro: v.porcentajeSeguro,
      tipoComisionAfpId: esAfp ? v.tipoComisionAfpId : null,
      tipoRegimen,
      condicionEspecialAfp: esAfp ? this.condicionEspecialAfp() : null,
      fechaCondicionAfp: esAfp ? this.fechaCondicionAfp() : null,
      documentoSustentoId: null,
      observacionCondicionAfp: esAfp ? this.observacionCondicionAfp() : null,
    };

    this.saving.set(true);
    if (this.isEdit()) {
      const id = this.editingPensionId();
      if (id == null) {
        this.saving.set(false);
        return;
      }
      this.pensionApi.actualizar(id, body).subscribe({
        next: () => this.onSaved('Pensión actualizada correctamente.'),
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
      return;
    }
    this.pensionApi.guardar(body).subscribe({
      next: () => this.onSaved('Pensión registrada correctamente.'),
      error: (err: HttpErrorResponse) => this.onSaveErr(err),
    });
  }

  private onSaved(msg: string): void {
    this.saving.set(false);
    this.showForm.set(false);
    this.snack.open(msg, 'Cerrar', { duration: 4000 });
    this.loadList();
  }

  private onSaveErr(err: HttpErrorResponse): void {
    this.saving.set(false);
    this.onHttpSnack(err);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
