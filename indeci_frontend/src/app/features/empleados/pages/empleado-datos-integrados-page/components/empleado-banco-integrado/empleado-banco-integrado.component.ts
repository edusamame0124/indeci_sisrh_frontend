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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
import { EmpleadoBancoApiService } from '../../../../services/empleado-banco-api.service';
import { CatalogoApiService } from '../../../../services/catalogo-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { sisrhConfirmDialogConfig } from '../../../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../../../shared/components/empty-state/empty-state.component';
import type { EmpleadoBancoRow, EmpleadoBancoInput } from '../../../../models/empleado-banco.model';
import type { BankAccountTypeCatalogItem, BankCatalogItem } from '../../../../models/catalog-item.model';

const CUENTA_NUMERO_MAX_LEN = 30;
const CUENTA_NUMERO_PATTERN = /^\d+$/;
const CCI_LEN = 20;

function cciOpcionalValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return { pattern: true };
  if (raw.length !== CCI_LEN) return { cciLength: true };
  return null;
}

@Component({
  selector: 'app-empleado-banco-integrado',
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
  templateUrl: './empleado-banco-integrado.component.html',
  styles: `
    :host {
      display: block;
      font-family: var(--sisrh-font-sans, sans-serif);
    }
    .grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .full {
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
  `,
})
export class EmpleadoBancoIntegradoComponent implements OnInit {
  readonly empleadoId = input.required<number>();
  readonly personaId = input.required<number>();
  readonly hasRecord = output<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly bancoApi = inject(EmpleadoBancoApiService);
  private readonly catalogo = inject(CatalogoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly dialogs = inject(MatDialog);

  readonly isEdit = signal(false);
  readonly editingCuentaId = signal<number | null>(null);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);
  readonly showForm = signal(false);

  readonly bancos = signal<readonly BankCatalogItem[]>([]);
  readonly tipos = signal<readonly BankAccountTypeCatalogItem[]>([]);
  readonly rows = signal<readonly EmpleadoBancoRow[]>([]);
  
  readonly tableLoading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly columns = ['banco', 'tipo', 'numeroCuenta', 'cci', 'planilla', 'acciones'] as const;

  readonly cuentaNumeroMaxLen = CUENTA_NUMERO_MAX_LEN;
  readonly cciLen = CCI_LEN;

  readonly form = this.fb.group({
    bankId: this.fb.control<number | null>(null, Validators.required),
    accountTypeId: this.fb.control<number | null>(null, Validators.required),
    numeroCuenta: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(CUENTA_NUMERO_PATTERN),
      Validators.maxLength(CUENTA_NUMERO_MAX_LEN),
    ]),
    cci: this.fb.nonNullable.control('', [cciOpcionalValidator]),
    esCuentaPlanilla: this.fb.nonNullable.control<number>(0),
  });

  readonly pagedRows = computed(() => {
    const list = this.rows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  onDigitsOnlyInput(event: Event, field: 'numeroCuenta' | 'cci'): void {
    const input = event.target as HTMLInputElement;
    const max = field === 'numeroCuenta' ? CUENTA_NUMERO_MAX_LEN : CCI_LEN;
    const digits = input.value.replace(/\\D/g, '').slice(0, max);
    if (input.value !== digits) {
      input.value = digits;
    }
    this.form.controls[field].setValue(digits, { emitEvent: false });
  }

  ngOnInit(): void {
    if (this.empleadoId() < 1) {
      this.pageLoading.set(false);
      return;
    }

    this.catalogo.listarBancos().subscribe({
      next: (b) => this.bancos.set(b),
      error: () => this.bancos.set([]),
    });
    this.catalogo.listarTiposCuenta().subscribe({
      next: (t) => this.tipos.set(t),
      error: () => this.tipos.set([]),
    });

    this.loadList();
    this.pageLoading.set(false);
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  private loadList(): void {
    this.tableLoading.set(true);
    this.bancoApi.listar(this.empleadoId()).subscribe({
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

  iniciarNuevaCuenta(): void {
    this.form.reset({
      numeroCuenta: '',
      cci: '',
      esCuentaPlanilla: 0
    });
    this.isEdit.set(false);
    this.editingCuentaId.set(null);
    this.showForm.set(true);
  }

  editarCuenta(row: EmpleadoBancoRow): void {
    this.isEdit.set(true);
    this.editingCuentaId.set(row.id);
    this.showForm.set(true);
    
    this.form.patchValue({
      bankId: row.bankId,
      accountTypeId: row.accountTypeId,
      numeroCuenta: row.numeroCuenta,
      cci: row.cci ?? '',
      esCuentaPlanilla: row.esCuentaPlanilla ?? 0,
    });
  }

  cancelarForm(): void {
    this.showForm.set(false);
  }

  confirmEliminar(row: EmpleadoBancoRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Desactivar cuenta',
        message: `Se desactivará la cuenta N° ${row.numeroCuenta}. ¿Continuar?`,
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
    this.bancoApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Cuenta desactivada correctamente.', 'Cerrar', { duration: 4000 });
        this.loadList();
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const empId = this.empleadoId();
    const bid = v.bankId;
    const aid = v.accountTypeId;
    if (bid == null || aid == null || empId < 1) return;

    const body = {
      empleadoId: empId,
      bankId: bid,
      accountTypeId: aid,
      numeroCuenta: v.numeroCuenta.trim(),
      cci: v.cci.trim(),
      esCuentaPlanilla: v.esCuentaPlanilla,
    };

    this.saving.set(true);
    if (this.isEdit()) {
      const cid = this.editingCuentaId();
      if (cid == null) {
        this.saving.set(false);
        return;
      }
      this.bancoApi.actualizar(cid, body).subscribe({
        next: () => this.onSaved('Cuenta actualizada correctamente.'),
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
      return;
    }
    this.bancoApi.guardar(body).subscribe({
      next: () => this.onSaved('Cuenta registrada correctamente.'),
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
