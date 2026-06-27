import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
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
import { EmpleadoPuestoApiService } from '../../../../services/empleado-puesto-api.service';
import { CatalogoApiService } from '../../../../services/catalogo-api.service';
import { CargoApiService } from '../../../../services/cargo-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { sisrhConfirmDialogConfig } from '../../../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../../../shared/components/empty-state/empty-state.component';
import type { EmpleadoPuestoRow, EmpleadoPuestoInput } from '../../../../models/empleado-puesto.model';
import type { Cargo } from '../../../../models/cargo.model';
import type { Nivel } from '../../../../../catalogos/models/nivel.model';
import type { Sede } from '../../../../../catalogos/models/sede.model';
import type { Oficina } from '../../../../../catalogos/models/oficina.model';
import type { Dependencia } from '../../../../../catalogos/models/dependencia.model';
import type { EstructuraOrganica } from '../../../../../catalogos/models/estructura-organica.model';

@Component({
  selector: 'app-empleado-puesto-integrado',
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
  templateUrl: './empleado-puesto-integrado.component.html',
  styles: `
    :host {
      display: block;
      font-family: var(--sisrh-font-sans, sans-serif);
    }
    .section {
      margin: 1rem 0 0.5rem;
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
    .hint {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 1rem;
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
export class EmpleadoPuestoIntegradoComponent implements OnInit {
  readonly empleadoId = input.required<number>();
  readonly personaId = input.required<number>();
  readonly hasRecord = output<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly puestoApi = inject(EmpleadoPuestoApiService);
  private readonly catalogos = inject(CatalogoApiService);
  private readonly cargoApi = inject(CargoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogs = inject(MatDialog);

  // Form states
  readonly isEdit = signal(false);
  readonly editingPuestoId = signal<number | null>(null);
  readonly primerRegistroDePuesto = signal(false);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);
  readonly showForm = signal(false);

  // Catalogs
  readonly cargos = signal<readonly Cargo[]>([]);
  readonly niveles = signal<readonly Nivel[]>([]);
  readonly sedes = signal<readonly Sede[]>([]);
  readonly oficinas = signal<readonly Oficina[]>([]);
  readonly oficinasLoading = signal(false);
  readonly dependencias = signal<readonly Dependencia[]>([]);
  readonly estructuras = signal<readonly EstructuraOrganica[]>([]);

  // Table states
  readonly rows = signal<readonly EmpleadoPuestoRow[]>([]);
  readonly tableLoading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 20, 50] as const;
  readonly columns = ['cargo', 'nivel', 'sede', 'oficina', 'dependencia', 'estructuraOrganica', 'activo', 'acciones'] as const;

  readonly form = this.fb.group({
    cargoId: this.fb.nonNullable.control(0, [
      (c) => (c.value && c.value > 0 ? null : { cargoRequired: true }),
    ]),
    nivelId: this.fb.control<number | null>(null),
    sedeId: this.fb.control<number | null>(null),
    oficinaId: this.fb.control<number | null>(null),
    dependenciaId: this.fb.control<number | null>(null),
    estructuraOrganicaId: this.fb.control<number | null>(null),
  });

  readonly pagedRows = computed(() => {
    const list = this.rows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly hasHistorialRows = computed(() => !this.tableLoading() && this.rows().length > 0);

  constructor() {
    this.form.controls.oficinaId.disable({ emitEvent: false });
    this.form.controls.sedeId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sedeId) => this.onSedeChange(sedeId ?? null));
  }

  ngOnInit(): void {
    if (this.empleadoId() < 1) {
      this.pageLoading.set(false);
      return;
    }

    forkJoin({
      cargos: this.cargoApi.listarCargos(),
      niveles: this.catalogos.listarNiveles(),
      sedes: this.catalogos.listarSedes(),
      dependencias: this.catalogos.listarDependencias(),
      estructuras: this.catalogos.listarEstructurasOrganicas(),
    }).subscribe({
      next: (res) => {
        this.cargos.set(res.cargos);
        this.niveles.set(res.niveles);
        this.sedes.set(res.sedes);
        this.dependencias.set(res.dependencias);
        this.estructuras.set(res.estructuras);
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

  catalogLabel(nombre: string | null | undefined, id: number | null | undefined): string {
    const label = nombre?.trim();
    if (label) return label;
    if (id != null && id > 0) return String(id);
    return '—';
  }

  private loadList(): void {
    this.tableLoading.set(true);
    this.puestoApi.listar(this.empleadoId()).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.hasRecord.emit(list.length > 0);
        this.primerRegistroDePuesto.set(list.length === 0);
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

  iniciarNuevoPuesto(): void {
    this.form.reset();
    this.form.controls.cargoId.setValue(0);
    this.isEdit.set(false);
    this.editingPuestoId.set(null);
    this.showForm.set(true);
  }

  editarPuesto(row: EmpleadoPuestoRow): void {
    if (row.activo !== 1) {
      this.snack.open('Solo puede editarse el puesto vigente.', 'Cerrar', { duration: 5000 });
      return;
    }
    this.isEdit.set(true);
    this.editingPuestoId.set(row.id);
    this.showForm.set(true);
    
    const cargoEncontrado = this.cargos().find((c) => c.nombre === row.cargo);
    const cargoId = cargoEncontrado?.id ?? 0;

    this.form.patchValue({
      cargoId,
      nivelId: row.nivelId,
      sedeId: row.sedeId,
      dependenciaId: row.dependenciaId ?? null,
      estructuraOrganicaId: row.estructuraOrganicaId ?? null,
    });

    const sedeId = row.sedeId;
    const oficinaId = row.oficinaId;
    if (sedeId != null && sedeId > 0) {
      this.oficinasLoading.set(true);
      this.catalogos.listarOficinasPorSede(sedeId).subscribe({
        next: (rows) => {
          this.oficinas.set(rows);
          this.oficinasLoading.set(false);
          this.form.controls.oficinaId.enable({ emitEvent: false });
          if (oficinaId != null && oficinaId > 0) {
            this.form.controls.oficinaId.setValue(oficinaId, { emitEvent: false });
          }
        },
        error: (err: HttpErrorResponse) => {
          this.oficinasLoading.set(false);
          this.onHttpSnack(err);
        },
      });
    }
  }

  cancelarForm(): void {
    this.showForm.set(false);
  }

  confirmEliminar(row: EmpleadoPuestoRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Desactivar puesto',
        message: `Se cerrará el registro de puesto "${row.cargo}". ¿Continuar?`,
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
    this.puestoApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Puesto desactivado correctamente.', 'Cerrar', { duration: 4000 });
        this.loadList();
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  private onSedeChange(sedeId: number | null): void {
    this.form.controls.oficinaId.setValue(null, { emitEvent: false });
    if (sedeId === null || sedeId < 1) {
      this.oficinas.set([]);
      this.oficinasLoading.set(false);
      this.form.controls.oficinaId.disable({ emitEvent: false });
      return;
    }
    this.form.controls.oficinaId.disable({ emitEvent: false });
    this.oficinasLoading.set(true);
    this.catalogos.listarOficinasPorSede(sedeId).subscribe({
      next: (rows) => {
        this.oficinas.set(rows);
        this.oficinasLoading.set(false);
        this.form.controls.oficinaId.enable({ emitEvent: false });
      },
      error: (err: HttpErrorResponse) => {
        this.oficinasLoading.set(false);
        this.oficinas.set([]);
        this.form.controls.oficinaId.disable({ emitEvent: false });
        this.onHttpSnack(err);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const empId = this.empleadoId();
    if (empId < 1) return;

    const body: EmpleadoPuestoInput = {
      empleadoId: empId,
      cargoId: v.cargoId,
      nivelId: v.nivelId != null && v.nivelId > 0 ? v.nivelId : undefined,
      sedeId: v.sedeId != null && v.sedeId > 0 ? v.sedeId : undefined,
      oficinaId: v.oficinaId != null && v.oficinaId > 0 ? v.oficinaId : undefined,
      dependenciaId: v.dependenciaId != null && v.dependenciaId > 0 ? v.dependenciaId : undefined,
      estructuraOrganicaId:
        v.estructuraOrganicaId != null && v.estructuraOrganicaId > 0
          ? v.estructuraOrganicaId
          : undefined,
    };

    this.saving.set(true);
    if (this.isEdit()) {
      const id = this.editingPuestoId();
      if (id == null) {
        this.saving.set(false);
        return;
      }
      this.puestoApi.actualizar(id, body).subscribe({
        next: () => this.onSaved('Puesto actualizado correctamente.'),
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
      return;
    }
    this.puestoApi.guardar(body).subscribe({
      next: () =>
        this.onSaved(
          this.primerRegistroDePuesto()
            ? 'Puesto registrado correctamente.'
            : 'Cambio de puesto registrado.',
        ),
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
