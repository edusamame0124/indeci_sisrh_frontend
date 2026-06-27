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
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { sisrhConfirmDialogConfig } from '../../../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../../../shared/components/empty-state/empty-state.component';
import { EmpleadoPlanillaApiService } from '../../../../services/empleado-planilla-api.service';
import { CatalogoApiService } from '../../../../services/catalogo-api.service';
import { TipoPersonaMefApiService } from '../../../../../planilla/services/tipo-persona-mef-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { padAirhspCode } from '../../../../utils/pad-airhsp-code';
import { calcIncrementosDsTotal } from '../../../../utils/calc-incrementos-ds-total';

import type { RegimenLaboral } from '../../../../../catalogos/models/regimen-laboral.model';
import type { TipoContrato } from '../../../../../catalogos/models/tipo-contrato.model';
import type { CondicionLaboral } from '../../../../../catalogos/models/condicion-laboral.model';
import type { TipoPersonaMef } from '../../../../../planilla/models/tipo-persona-mef.model';
import type { EmpleadoPlanillaRow } from '../../../../models/empleado-planilla.model';
import type { IncrementosDsResponse } from '../../../../models/incrementos-ds.model';

import { UppercaseDirective } from '../../../../../../shared/directives/uppercase.directive';
import { IncrementosDsPanelComponent } from '../../../empleado-planilla-form-page/components/incrementos-ds-panel/incrementos-ds-panel.component';

const MONTO_INT_DIGITS = 5;
const MONTO_MAX = 99999.99;
const AIRHSP_PATTERN = /^[A-Z0-9]{6}$/;

@Component({
  selector: 'app-empleado-planilla-integrado',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatDialogModule,
    EmptyStateComponent,
    UppercaseDirective,
    IncrementosDsPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="integrado-container">
      @if (viewState() === 'list') {
        <div class="actions list-actions">
          <button
            mat-flat-button
            color="primary"
            type="button"
            [disabled]="!canRegistrar()"
            (click)="prepararNuevo()"
            [matTooltip]="
              canRegistrar()
                ? 'Registrar la configuración remunerativa del empleado'
                : 'Ya existe una configuración activa. Edítala o desactívala para registrar una nueva.'
            "
          >
            <mat-icon fontIcon="add" aria-hidden="true" />
            Registrar configuración
          </button>
        </div>

        @if (tableLoading()) {
          <div class="loading" aria-busy="true">
            <mat-progress-spinner mode="indeterminate" diameter="40" aria-label="Cargando datos" />
          </div>
        } @else if (rows().length === 0) {
          <app-empty-state
            icon="receipt_long"
            title="Sin planilla activa"
            description="Este colaborador no tiene una planilla activa registrada."
          />
        } @else {
          <div class="sisrh-table-scroll">
            <table mat-table [dataSource]="pagedRows()" class="tbl">
              <ng-container matColumnDef="regimen">
                <th mat-header-cell *matHeaderCellDef scope="col">Régimen</th>
                <td mat-cell *matCellDef="let row">{{ row.regimenLaboral ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="tipoContrato">
                <th mat-header-cell *matHeaderCellDef scope="col">Tipo contrato</th>
                <td mat-cell *matCellDef="let row">{{ row.tipoContrato ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="condicion">
                <th mat-header-cell *matHeaderCellDef scope="col">Condición</th>
                <td mat-cell *matCellDef="let row">{{ row.condicionLaboral ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="codigoAirhsp">
                <th mat-header-cell *matHeaderCellDef scope="col" matTooltip="Código AIRHSP">
                  Cód. AIRHSP
                </th>
                <td mat-cell *matCellDef="let row" class="sisrh-tabular col-airhsp">
                  {{ fmtAirhsp(row.registroPlazaAirhsp) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="montoContrato">
                <th mat-header-cell *matHeaderCellDef scope="col" matTooltip="Monto contrato base">
                  Monto base
                </th>
                <td mat-cell *matCellDef="let row" class="sisrh-tabular">
                  {{ fmtMoney(row.montoContrato) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="incrementosDs">
                <th mat-header-cell *matHeaderCellDef scope="col" matTooltip="Incrementos DS (total)">
                  Inc. DS
                </th>
                <td mat-cell *matCellDef="let row" class="sisrh-tabular" [matTooltip]="incrementosDsTooltip">
                  {{ fmtIncrementosDs(row) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="remuneracionMensual">
                <th mat-header-cell *matHeaderCellDef scope="col" matTooltip="Remuneración mensual">
                  Rem. mensual
                </th>
                <td mat-cell *matCellDef="let row" class="sisrh-tabular">
                  {{ fmtMoney(row.sueldoBasico) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef scope="col" class="col-sticky">Acciones</th>
                <td mat-cell *matCellDef="let row" class="col-sticky">
                  <a
                    mat-icon-button
                    (click)="prepararEdicion(row)"
                    aria-label="Editar configuración remunerativa"
                    matTooltip="Editar configuración remunerativa"
                  >
                    <mat-icon fontIcon="edit" aria-hidden="true" />
                  </a>
                  <button
                    mat-icon-button
                    type="button"
                    aria-label="Desactivar planilla"
                    matTooltip="Desactivar"
                    (click)="confirmEliminar(row)"
                  >
                    <mat-icon fontIcon="delete_outline" aria-hidden="true" />
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </div>
          <mat-paginator
            [length]="rows().length"
            [pageIndex]="pageIndex()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="pageSizeOptions"
            (page)="onPage($event)"
            showFirstLastButtons
            aria-label="Paginador de planilla"
          />
        }
      } @else {
        <!-- FORMULARIO -->
        <div class="form-header">
          <h3>{{ isEdit() ? 'Editar configuración remunerativa' : 'Nueva configuración remunerativa' }}</h3>
          <button mat-button (click)="cancelarFormulario()">Volver a la lista</button>
        </div>

        @if (formLoading()) {
          <div class="loading"><mat-progress-spinner diameter="48" mode="indeterminate" /></div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="planilla-form">
            <h4 class="section">Condiciones laborales</h4>
            <div class="grid">
              <mat-form-field appearance="outline" class="half">
                <mat-label>Régimen laboral</mat-label>
                <mat-select formControlName="regimenLaboralId" aria-required="true">
                  @for (r of regimenes(); track r.id) {
                    <mat-option [value]="r.id">{{ r.codigo }} - {{ r.nombre }}</mat-option>
                  }
                </mat-select>
                @if (form.controls.regimenLaboralId.hasError('required')) {
                  <mat-error>Requerido</mat-error>
                }
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="half">
                <mat-label>Condición laboral</mat-label>
                <mat-select formControlName="condicionLaboralId">
                  <mat-option [value]="null">Sin especificar</mat-option>
                  @for (c of condiciones(); track c.id) {
                    <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <div class="grid">
              <mat-form-field appearance="outline" class="half">
                <mat-label>Tipo contrato</mat-label>
                <mat-select formControlName="tipoContratoId">
                  <mat-option [value]="null">Sin especificar</mat-option>
                  @for (t of tiposContrato(); track t.id) {
                    <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="half">
                <mat-label>Tipo persona MEF</mat-label>
                <mat-select formControlName="tipoPersonaMefId">
                  <mat-option [value]="null">Sin especificar</mat-option>
                  @for (m of tiposPersonaMef(); track m.id) {
                    <mat-option [value]="m.id">{{ m.codigo }} - {{ m.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            
            <h4 class="section">Cálculo remunerativo</h4>
            <div class="grid">
              <mat-form-field appearance="outline" class="half">
                <mat-label>Monto contrato base (S/)</mat-label>
                <input 
                  matInput 
                  formControlName="montoContratado" 
                  type="number" 
                  step="0.01" 
                  (input)="onMontoContratadoInput($event)"
                  (blur)="onMontoContratadoBlur()"
                />
                @if (form.controls.montoContratado.hasError('required')) {
                  <mat-error>Requerido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="half">
                <mat-label>Remuneración total mensual (S/)</mat-label>
                <input matInput formControlName="sueldoBasico" type="number" readonly />
              </mat-form-field>
            </div>

            <div class="grid">
              <mat-form-field appearance="outline" class="half">
                <mat-label>N° Hijos (Asignación familiar)</mat-label>
                <input matInput formControlName="numHijos" type="number" min="0" step="1" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="half">
                <mat-label>Código Plaza AIRHSP (Opcional)</mat-label>
                <input matInput formControlName="registroPlazaAirhsp" appUppercase maxlength="6" />
                <mat-hint>Últimos 6 dígitos alfanuméricos</mat-hint>
              </mat-form-field>
            </div>

            @if (incrementosDs()) {
              <app-incrementos-ds-panel 
                [incrementos]="incrementosDs()"
                [montoContratado]="form.controls.montoContratado.value"
              />
            }

            <div class="actions">
              <button
                mat-flat-button
                color="primary"
                type="submit"
                [disabled]="form.invalid || saving()"
              >
                Guardar Configuración
              </button>
            </div>
          </form>
        }
      }
    </div>
  `,
  styles: [
    `
      .integrado-container {
        padding: 0.5rem 0;
      }
      .list-actions {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }
      .form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
      }
      .form-header h3 {
        margin: 0;
        color: var(--sisrh-color-primary, #0f172a);
        font-size: 1.1rem;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      .tbl {
        width: 100%;
      }
      .col-airhsp {
        font-family: var(--sisrh-font-mono, ui-monospace, monospace);
      }
      .col-sticky {
        position: sticky;
        right: 0;
        background: #fff;
        z-index: 1;
        box-shadow: -4px 0 8px rgb(15 23 42 / 4%);
      }
      .section {
        margin: 1.5rem 0 0.75rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--sisrh-text-primary, #1b1b1b);
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        padding-bottom: 0.25rem;
      }
      .section:first-of-type {
        margin-top: 0;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      @media (max-width: 600px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
      .half {
        width: 100%;
      }
      .actions {
        margin-top: 1rem;
      }
    `,
  ],
})
export class EmpleadoPlanillaIntegradoComponent implements OnInit {
  readonly empleadoId = input.required<number>();
  readonly personaId = input.required<number>();
  readonly hasRecord = output<boolean>();

  private readonly planillaApi = inject(EmpleadoPlanillaApiService);
  private readonly catalogoApi = inject(CatalogoApiService);
  private readonly tipoPersonaMefApi = inject(TipoPersonaMefApiService);
  private readonly fb = inject(FormBuilder);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly notif = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);

  // STATE: list vs form
  readonly viewState = signal<'list' | 'form'>('list');
  readonly isEdit = signal(false);
  readonly editId = signal<number | null>(null);

  // LIST STATE
  readonly rows = signal<readonly EmpleadoPlanillaRow[]>([]);
  readonly tableLoading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 20] as const;
  readonly columns = [
    'regimen',
    'tipoContrato',
    'condicion',
    'codigoAirhsp',
    'montoContrato',
    'incrementosDs',
    'remuneracionMensual',
    'acciones',
  ] as const;
  readonly incrementosDsTooltip = 'Suma de incrementos DS de negociación colectiva. Detalle en Editar.';

  readonly pagedRows = computed(() => {
    const list = this.rows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });
  readonly canRegistrar = computed(() => this.rows().length === 0);

  // FORM STATE
  readonly formLoading = signal(false);
  readonly saving = signal(false);
  readonly incrementosDs = signal<IncrementosDsResponse | null>(null);
  
  readonly regimenes = signal<readonly RegimenLaboral[]>([]);
  readonly tiposContrato = signal<readonly TipoContrato[]>([]);
  readonly condiciones = signal<readonly CondicionLaboral[]>([]);
  readonly tiposPersonaMef = signal<readonly TipoPersonaMef[]>([]);

  readonly form = this.fb.group({
    regimenLaboralId: this.fb.control<number | null>(null, [Validators.required]),
    tipoContratoId: this.fb.control<number | null>(null),
    condicionLaboralId: this.fb.control<number | null>(null),
    montoContratado: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(MONTO_MAX),
    ]),
    sueldoBasico: this.fb.control<number | null>({ value: null, disabled: true }, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(MONTO_MAX),
    ]),
    numHijos: this.fb.control<number | null>(null, [Validators.min(0)]),
    tipoPersonaMefId: this.fb.control<number | null>(null),
    registroPlazaAirhsp: this.fb.control<string>('', [
      Validators.pattern(AIRHSP_PATTERN),
      Validators.maxLength(6),
    ]),
  });

  private readonly moneyFmt = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  constructor() {
    merge(
      this.form.controls.regimenLaboralId.valueChanges,
      this.form.controls.condicionLaboralId.valueChanges,
    )
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.recalcularIncrementos());
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.loadList();
  }

  // --- LIST METHODS ---
  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  private loadList(): void {
    this.tableLoading.set(true);
    this.planillaApi.listar(this.empleadoId()).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.hasRecord.emit(list.length > 0);
        this.clampPageIndex(list.length);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private clampPageIndex(total: number): void {
    const ps = this.pageSize();
    const maxIdx = total > 0 ? Math.max(0, Math.ceil(total / ps) - 1) : 0;
    if (this.pageIndex() > maxIdx) this.pageIndex.set(maxIdx);
  }

  confirmEliminar(row: EmpleadoPlanillaRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Desactivar planilla',
        message: 'Se desactivará el registro de planilla y dejará de considerarse vigente. ¿Continuar?',
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
    this.planillaApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Planilla desactivada correctamente.', 'Cerrar', { duration: 4000 });
        this.loadList();
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  fmtMoney(value: number | null): string {
    if (value == null || Number.isNaN(value)) return '—';
    return this.moneyFmt.format(value);
  }

  fmtAirhsp(value: string | null): string {
    if (value == null || value.trim() === '') return '—';
    return value;
  }

  fmtIncrementosDs(row: EmpleadoPlanillaRow): string {
    const total = calcIncrementosDsTotal(row.sueldoBasico, row.montoContrato);
    if (total == null) return '—';
    return this.moneyFmt.format(total);
  }

  // --- FORM METHODS ---
  private cargarCatalogos(): void {
    this.catalogoApi.listarRegimenesLaborales().subscribe({
      next: (list) => {
        const filtrados = list.filter((r) => r.codigo !== '728' && r.codigo !== '9999');
        this.regimenes.set(filtrados);
      },
    });
    this.catalogoApi.listarTiposContrato().subscribe({
      next: (list) => this.tiposContrato.set(list),
    });
    this.catalogoApi.listarCondicionesLaborales().subscribe({
      next: (list) => this.condiciones.set(list),
    });
    this.tipoPersonaMefApi.listarActivos().subscribe({
      next: (list) => this.tiposPersonaMef.set(list),
    });
  }

  prepararNuevo(): void {
    if (!this.canRegistrar()) return;
    this.isEdit.set(false);
    this.editId.set(null);
    this.form.reset({ regimenLaboralId: null, tipoContratoId: null, condicionLaboralId: null, montoContratado: null, sueldoBasico: null, numHijos: null, tipoPersonaMefId: null, registroPlazaAirhsp: '' });
    this.viewState.set('form');
  }

  prepararEdicion(row: EmpleadoPlanillaRow): void {
    this.isEdit.set(true);
    this.editId.set(row.id);
    this.viewState.set('form');
    this.formLoading.set(true);
    
    // Simulate API fetch delay to patch form properly or fetch fresh data if needed.
    // Since we have the row, we can patch directly.
    const montoContratado = row.montoContrato ?? row.sueldoBasico;
    this.form.patchValue({
      regimenLaboralId: row.regimenLaboralId,
      tipoContratoId: row.tipoContratoId,
      condicionLaboralId: row.condicionLaboralId,
      montoContratado,
      sueldoBasico: row.sueldoBasico,
      numHijos: row.numHijos,
      tipoPersonaMefId: (row as any).tipoPersonaMefId ?? null,
      registroPlazaAirhsp: (row as any).registroPlazaAirhsp ?? '',
    });
    this.recalcularIncrementos();
    this.formLoading.set(false);
  }

  cancelarFormulario(): void {
    this.viewState.set('list');
  }

  onMontoContratadoInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input || input.value === '') return;
    const raw = input.value;
    const [intPart = '', decPart] = raw.split('.');
    const cappedInt = intPart.slice(0, MONTO_INT_DIGITS);
    const cappedDec = decPart != null ? decPart.slice(0, 2) : undefined;
    const cleaned = cappedDec !== undefined ? `${cappedInt}.${cappedDec}` : cappedInt;
    if (raw !== cleaned) {
      const num = cleaned === '' || cleaned === '.' ? null : Number(cleaned);
      this.form.controls.montoContratado.setValue(Number.isFinite(num as number) ? (num as number) : null);
    }
  }

  onMontoContratadoBlur(): void {
    this.recalcularIncrementos();
  }

  recalcularIncrementos(): void {
    const regimenId = this.form.controls.regimenLaboralId.value;
    const monto = this.form.controls.montoContratado.value;
    if (regimenId == null || monto == null || monto < 0.01) {
      this.incrementosDs.set(null);
      return;
    }

    this.planillaApi
      .calcularIncrementosDs({
        regimenLaboralId: regimenId,
        condicionLaboralId: this.form.controls.condicionLaboralId.value,
        montoContratado: monto,
      })
      .subscribe({
        next: (resp) => {
          this.incrementosDs.set(resp);
          this.form.controls.sueldoBasico.setValue(resp.remuneracionMensual);
        },
        error: () => this.incrementosDs.set(null),
      });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (v.sueldoBasico == null || v.montoContratado == null) return;
    if (v.regimenLaboralId == null) return;

    const body = {
      empleadoId: this.empleadoId(),
      codigoAirhsp: '000000',
      montoContrato: v.montoContratado,
      sueldoBasico: v.sueldoBasico,
      tieneAsignacionFamiliar: (v.numHijos ?? 0) > 0 ? 1 : 0,
      numHijos: v.numHijos ?? undefined,
      regimenLaboralId: v.regimenLaboralId,
      tipoContratoId: v.tipoContratoId ?? null,
      condicionLaboralId: v.condicionLaboralId ?? null,
      tipoPersonaMefId: v.tipoPersonaMefId ?? null,
      registroPlazaAirhsp: v.registroPlazaAirhsp ?? '',
    };

    this.saving.set(true);
    if (this.isEdit()) {
      const id = this.editId();
      if (!id) return;
      this.planillaApi.actualizar(id, body).subscribe({
        next: () => this.onSaved('Planilla actualizada.'),
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
      return;
    }
    
    this.planillaApi.guardar(body).subscribe({
      next: () => this.onSaved('Planilla registrada.'),
      error: (err: HttpErrorResponse) => this.onSaveErr(err),
    });
  }

  private onSaved(msg: string): void {
    this.saving.set(false);
    this.notif.exito(msg);
    this.viewState.set('list');
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
