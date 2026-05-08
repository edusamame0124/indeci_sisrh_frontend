import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmpleadoBancoApiService } from '../../services/empleado-banco-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { CatalogoApiService } from '../../services/catalogo-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { BankAccountTypeCatalogItem, BankCatalogItem } from '../../models/catalog-item.model';

@Component({
  selector: 'app-empleado-banco-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <nav class="crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/rrhh/cuentas-bancarias">Cuentas bancarias</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button [routerLink]="['/rrhh/cuentas-bancarias/personas', personaId()]">
          {{ personaLabel() }}
        </a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">{{ isEdit() ? 'Editar cuenta' : 'Nueva cuenta' }}</span>
      </nav>

      <a mat-button [routerLink]="['/rrhh/cuentas-bancarias/personas', personaId()]">Volver</a>

      @if (pageLoading()) {
        <div class="loading"><mat-progress-spinner diameter="48" mode="indeterminate" /></div>
      } @else {
        <mat-card class="page-card sisrh-elevated">
          <mat-card-header>
            <mat-card-title>{{ isEdit() ? 'Editar cuenta bancaria' : 'Registrar cuenta bancaria' }}</mat-card-title>
            <mat-card-subtitle>Datos para abonos y pagos institucionales</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="grid">
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Banco</mat-label>
                  <mat-select formControlName="bankId" aria-label="Banco">
                    @for (b of bancos(); track b.id) {
                      <mat-option [value]="b.id">{{ b.name }}</mat-option>
                    }
                  </mat-select>
                  @if (form.controls.bankId.hasError('required')) {
                    <mat-error>Selecciona un banco</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>Tipo de cuenta</mat-label>
                  <mat-select formControlName="accountTypeId" aria-label="Tipo de cuenta">
                    @for (t of tipos(); track t.id) {
                      <mat-option [value]="t.id">{{ t.name }}</mat-option>
                    }
                  </mat-select>
                  @if (form.controls.accountTypeId.hasError('required')) {
                    <mat-error>Selecciona el tipo de cuenta</mat-error>
                  }
                  @if (isEdit()) {
                    <mat-hint>Confirma el tipo de cuenta al editar (no se muestra en el listado).</mat-hint>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>Número de cuenta</mat-label>
                  <input matInput formControlName="numeroCuenta" maxlength="64" autocomplete="off" />
                  @if (form.controls.numeroCuenta.hasError('required')) {
                    <mat-error>Ingresa el número de cuenta</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>CCI</mat-label>
                  <input matInput formControlName="cci" maxlength="64" autocomplete="off" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>Cuenta para planilla</mat-label>
                  <mat-select formControlName="esCuentaPlanilla" aria-label="Cuenta para planilla">
                    <mat-option [value]="0">No</mat-option>
                    <mat-option [value]="1">Sí</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="actions">
                <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                  Guardar
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 1rem;
      font-family: var(--sisrh-font-sans, sans-serif);
    }
    .page-card.sisrh-elevated {
      box-shadow:
        0 1px 2px rgb(15 23 42 / 6%),
        0 6px 20px rgb(15 23 42 / 8%);
      border-radius: 12px;
      margin-top: 0.75rem;
    }
    .crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
      font-size: 0.875rem;
    }
    .crumbs__sep {
      color: #94a3b8;
    }
    .crumbs__here {
      font-weight: 600;
      color: #475569;
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
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
  `,
})
export class EmpleadoBancoFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly personaApi = inject(PersonaApiService);
  private readonly bancoApi = inject(EmpleadoBancoApiService);
  private readonly catalogo = inject(CatalogoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly personaId = signal(0);
  readonly personaLabel = signal('Persona');
  readonly empleadoId = signal(0);
  readonly cuentaId = signal<number | null>(null);
  readonly isEdit = signal(false);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);
  readonly bancos = signal<readonly BankCatalogItem[]>([]);
  readonly tipos = signal<readonly BankAccountTypeCatalogItem[]>([]);

  readonly form = this.fb.group({
    bankId: this.fb.control<number | null>(null, Validators.required),
    accountTypeId: this.fb.control<number | null>(null, Validators.required),
    numeroCuenta: this.fb.nonNullable.control('', Validators.required),
    cci: this.fb.nonNullable.control<string>(''),
    esCuentaPlanilla: this.fb.nonNullable.control<number>(0),
  });

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] === 'edit' ? 'edit' : 'create';
    this.isEdit.set(mode === 'edit');

    const pidStr = this.route.snapshot.paramMap.get('personaId');
    const pid = pidStr ? Number(pidStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/rrhh/cuentas-bancarias']);
      return;
    }
    this.personaId.set(pid);

    if (mode === 'edit') {
      const cidStr = this.route.snapshot.paramMap.get('cuentaId');
      const cid = cidStr ? Number(cidStr) : NaN;
      if (!Number.isFinite(cid) || cid < 1) {
        void this.router.navigate(['/rrhh/cuentas-bancarias/personas', pid]);
        return;
      }
      this.cuentaId.set(cid);
    }

    this.catalogo.listarBancos().subscribe({
      next: (b) => this.bancos.set(b),
      error: () => this.bancos.set([]),
    });
    this.catalogo.listarTiposCuenta().subscribe({
      next: (t) => this.tipos.set(t),
      error: () => this.tipos.set([]),
    });

    this.personaApi.obtenerPorId(pid).subscribe({
      next: (p) => {
        this.personaLabel.set(p.nombreCompleto);
        const eid = p.empleadoId != null && p.empleadoId > 0 ? p.empleadoId : 0;
        if (eid < 1) {
          this.snack.open('No hay empleado vinculado a esta persona.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/rrhh/cuentas-bancarias']);
          return;
        }
        this.empleadoId.set(eid);
        if (mode === 'edit') {
          this.patchFromList(eid, this.cuentaId()!);
        } else {
          this.pageLoading.set(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.onHttpFail(err, ['/rrhh/cuentas-bancarias']);
      },
    });
  }

  private patchFromList(empleadoId: number, targetId: number): void {
    this.bancoApi.listar(empleadoId).subscribe({
      next: (list) => {
        const row = list.find((r) => r.id === targetId);
        if (!row) {
          this.snack.open('No se encontró la cuenta solicitada.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/rrhh/cuentas-bancarias/personas', this.personaId()]);
          return;
        }
        /** accountTypeId not returned by backend list DTO — user must confirm type on edit */
        this.form.patchValue({
          bankId: row.bankId,
          numeroCuenta: row.numeroCuenta,
          cci: row.cci ?? '',
          esCuentaPlanilla: row.esCuentaPlanilla ?? 0,
        });
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => this.onHttpFail(err, ['/rrhh/cuentas-bancarias/personas', this.personaId()]),
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
      numeroCuenta: v.numeroCuenta.trim().toUpperCase(),
      cci: v.cci.trim(),
      esCuentaPlanilla: v.esCuentaPlanilla,
    };

    this.saving.set(true);
    if (this.isEdit()) {
      const cid = this.cuentaId();
      if (cid == null) {
        this.saving.set(false);
        return;
      }
      this.bancoApi.actualizar(cid, body).subscribe({
        next: () => this.onSaved('Cuenta actualizada.'),
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
      return;
    }
    this.bancoApi.guardar(body).subscribe({
      next: () => this.onSaved('Cuenta registrada.'),
      error: (err: HttpErrorResponse) => this.onSaveErr(err),
    });
  }

  private onSaved(msg: string): void {
    this.saving.set(false);
    this.snack.open(msg, 'Cerrar', { duration: 4000 });
    void this.router.navigate(['/rrhh/cuentas-bancarias/personas', this.personaId()]);
  }

  private onSaveErr(err: HttpErrorResponse): void {
    this.saving.set(false);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }

  private onHttpFail(err: HttpErrorResponse, segments: readonly (string | number)[]): void {
    this.pageLoading.set(false);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
    void this.router.navigate([...segments]);
  }
}
