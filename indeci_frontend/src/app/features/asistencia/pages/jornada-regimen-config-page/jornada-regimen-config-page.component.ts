import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import { JornadaRegimenApiService } from '../../services/jornada-regimen-api.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { RegimenLaboral } from '../../../catalogos/models/regimen-laboral.model';
import type { JornadaRegimen } from '../../models/jornada-regimen.model';

@Component({
  selector: 'app-jornada-regimen-config-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './jornada-regimen-config-page.component.html',
  styleUrl: './jornada-regimen-config-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JornadaRegimenConfigPageComponent implements OnInit {
  private readonly catalogoApi = inject(CatalogoApiService);
  private readonly jornadaApi = inject(JornadaRegimenApiService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly regimenes = signal<readonly RegimenLaboral[]>([]);
  readonly regimenSeleccionado = signal<number | null>(null);

  readonly horaIngreso = signal<string>('');
  readonly horaSalida = signal<string>('');
  readonly refrigerioInicio = signal<string>('');
  readonly refrigerioFin = signal<string>('');
  readonly toleranciaIngresoMin = signal<number>(0);
  readonly toleranciaAlmuerzoMin = signal<number>(0);
  readonly umbralTardanzaDiariaMin = signal<number>(10);
  readonly topeTardanzaMensualMin = signal<number>(60);
  readonly jornadaHoras = signal<number>(8);

  readonly cargandoRegimenes = signal(true);
  readonly cargandoConfig = signal(false);
  readonly guardando = signal(false);

  // ---- Tabla de configuraciones registradas (paginada en cliente) ----
  readonly columnas = [
    'regimen', 'ingreso', 'salida', 'refrigerio', 'tolIngreso', 'tolAlmuerzo', 'jornada', 'acciones',
  ] as const;
  readonly configs = signal<readonly JornadaRegimen[]>([]);
  readonly cargandoConfigs = signal(true);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(5);

  readonly hayRegimen = computed(() => this.regimenSeleccionado() != null);

  /** Obligatorios: régimen, hora de ingreso, hora de salida y tolerancia de ingreso. */
  readonly formularioValido = computed(() => {
    const tol = this.toleranciaIngresoMin();
    return (
      this.regimenSeleccionado() != null &&
      this.horaIngreso().trim() !== '' &&
      this.horaSalida().trim() !== '' &&
      tol != null &&
      Number.isFinite(Number(tol)) &&
      Number(tol) >= 0
    );
  });

  readonly configsPaginadas = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.configs().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.cargarRegimenes();
    this.cargarConfigs();
  }

  onRegimenChange(regimenLaboralId: number): void {
    this.regimenSeleccionado.set(regimenLaboralId);
    this.cargarConfig(regimenLaboralId);
  }

  guardar(): void {
    const regimenLaboralId = this.regimenSeleccionado();
    if (regimenLaboralId == null) {
      this.snack.open('Seleccione un régimen laboral.', 'Cerrar', { duration: 4000 });
      return;
    }
    if (!this.formularioValido()) {
      this.snack.open(
        'Complete los campos obligatorios: hora de ingreso, hora de salida y tolerancia de ingreso.',
        'Cerrar',
        { duration: 5000 },
      );
      return;
    }
    this.guardando.set(true);
    this.jornadaApi
      .guardar({
        regimenLaboralId,
        horaIngreso: this.horaIngreso() || null,
        horaSalida: this.horaSalida() || null,
        refrigerioInicio: this.refrigerioInicio() || null,
        refrigerioFin: this.refrigerioFin() || null,
        toleranciaIngresoMin: Math.max(0, Math.trunc(Number(this.toleranciaIngresoMin()) || 0)),
        toleranciaAlmuerzoMin: Math.max(0, Math.trunc(Number(this.toleranciaAlmuerzoMin()) || 0)),
        umbralTardanzaDiariaMin: Math.max(0, Math.trunc(Number(this.umbralTardanzaDiariaMin()) || 0)),
        topeTardanzaMensualMin: Math.max(0, Math.trunc(Number(this.topeTardanzaMensualMin()) || 0)),
        jornadaHoras: Number(this.jornadaHoras()) || 8,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.notificacion.exito('Jornada del régimen guardada.', 'Configuración exitosa');
          this.cargarConfigs();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.onHttpSnack(err);
        },
      });
  }

  /** Carga una configuración existente en el formulario para editarla. */
  editar(config: JornadaRegimen): void {
    this.regimenSeleccionado.set(config.regimenLaboralId);
    this.horaIngreso.set(config.horaIngreso ?? '');
    this.horaSalida.set(config.horaSalida ?? '');
    this.refrigerioInicio.set(config.refrigerioInicio ?? '');
    this.refrigerioFin.set(config.refrigerioFin ?? '');
    this.toleranciaIngresoMin.set(config.toleranciaIngresoMin ?? 0);
    this.toleranciaAlmuerzoMin.set(config.toleranciaAlmuerzoMin ?? 0);
    this.umbralTardanzaDiariaMin.set(config.umbralTardanzaDiariaMin ?? 10);
    this.topeTardanzaMensualMin.set(config.topeTardanzaMensualMin ?? 60);
    this.jornadaHoras.set(config.jornadaHoras ?? 8);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  /** Elimina la configuración de un régimen, previa confirmación. */
  eliminar(config: JornadaRegimen): void {
    const data: ConfirmDialogData = {
      title: 'Eliminar configuración',
      message:
        `Se eliminará la jornada del régimen ${config.regimenCodigo ?? ''} ` +
        `${config.regimenNombre ?? ''}. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      severity: 'danger',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado !== true) {
          return;
        }
        this.jornadaApi.eliminar(config.regimenLaboralId).subscribe({
          next: () => {
            this.notificacion.exito('Configuración eliminada.', 'Eliminación exitosa');
            if (this.regimenSeleccionado() === config.regimenLaboralId) {
              this.limpiarFormulario();
            }
            this.cargarConfigs();
          },
          error: (err: HttpErrorResponse) => this.onHttpSnack(err),
        });
      });
  }

  private limpiarFormulario(): void {
    this.regimenSeleccionado.set(null);
    this.horaIngreso.set('');
    this.horaSalida.set('');
    this.refrigerioInicio.set('');
    this.refrigerioFin.set('');
    this.toleranciaIngresoMin.set(0);
    this.toleranciaAlmuerzoMin.set(0);
    this.umbralTardanzaDiariaMin.set(10);
    this.topeTardanzaMensualMin.set(60);
    this.jornadaHoras.set(8);
  }

  private cargarConfigs(): void {
    this.cargandoConfigs.set(true);
    this.jornadaApi.listar().subscribe({
      next: (rows) => {
        this.configs.set(rows);
        this.cargandoConfigs.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoConfigs.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private cargarRegimenes(): void {
    this.cargandoRegimenes.set(true);
    this.catalogoApi.listarRegimenesLaborales().subscribe({
      next: (rows) => {
        this.regimenes.set([...rows].sort((a, b) => a.codigo.localeCompare(b.codigo)));
        this.cargandoRegimenes.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoRegimenes.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private cargarConfig(regimenLaboralId: number): void {
    this.cargandoConfig.set(true);
    this.jornadaApi.obtener(regimenLaboralId).subscribe({
      next: (cfg) => {
        this.horaIngreso.set(cfg.horaIngreso ?? '');
        this.horaSalida.set(cfg.horaSalida ?? '');
        this.refrigerioInicio.set(cfg.refrigerioInicio ?? '');
        this.refrigerioFin.set(cfg.refrigerioFin ?? '');
        this.toleranciaIngresoMin.set(cfg.toleranciaIngresoMin ?? 0);
        this.toleranciaAlmuerzoMin.set(cfg.toleranciaAlmuerzoMin ?? 0);
        this.umbralTardanzaDiariaMin.set(cfg.umbralTardanzaDiariaMin ?? 10);
        this.topeTardanzaMensualMin.set(cfg.topeTardanzaMensualMin ?? 60);
        this.jornadaHoras.set(cfg.jornadaHoras ?? 8);
        this.cargandoConfig.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoConfig.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
