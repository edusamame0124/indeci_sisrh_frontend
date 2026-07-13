import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PadronVacacionalApiService } from '../../services/padron-vacacional-api.service';
import { PadronVacacionalRowDto, RecalculoManualResult } from '../../models/padron-vacacional.model';
import { VacacionDetalleDialogComponent } from '../vacacion-detalle-dialog/vacacion-detalle-dialog.component';
import { GoceDirectoDialogComponent } from '../goce-directo-dialog/goce-directo-dialog.component';
import { AcumulacionDecisionDialogComponent } from '../acumulacion-decision-dialog/acumulacion-decision-dialog.component';
import { ProvisionarAutoDialogComponent } from '../provisionar-auto-dialog/provisionar-auto-dialog.component';
import { HistorialSaldoDialogComponent } from '../historial-saldo-dialog/historial-saldo-dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificacionService } from '../../../../core/services/notificacion.service';

@Component({
  selector: 'app-padron-vacacional-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './padron-vacacional-tab.component.html',
  styleUrl: './padron-vacacional-tab.component.css',
})
export class PadronVacacionalTabComponent implements OnInit {
  private readonly apiService = inject(PadronVacacionalApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly notificacion = inject(NotificacionService);

  cargando = signal(false);
  error = signal<string | null>(null);

  datos = signal<PadronVacacionalRowDto[]>([]);
  totalElements = signal(0);
  pageIndex = signal(0);
  pageSize = signal(25);

  filtroBusqueda = signal('');

  ngOnInit(): void {
    this.cargarPadron();
  }

  cargarPadron(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.apiService.consultar(this.filtroBusqueda(), this.pageIndex(), this.pageSize()).subscribe({
      next: (resp) => {
        this.datos.set(resp.data?.content ?? []);
        this.totalElements.set(resp.data?.totalElements ?? 0);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el padrón vacacional.');
        this.cargando.set(false);
      }
    });
  }

  buscar(): void {
    this.pageIndex.set(0);
    this.cargarPadron();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda.set('');
    this.buscar();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.cargarPadron();
  }

  claseSemaforo(saldo: number): string {
    if (saldo >= 30) return 'badge badge--success';
    if (saldo > 0) return 'badge badge--warning';
    return 'badge badge--danger';
  }

  claseRecord(estado: string): string {
    if (estado === 'OK') return 'badge badge--success';
    if (estado === 'SIN_RECORD_LEGAL') return 'badge badge--danger';
    // Refactor Récord Anual Estricto: primer año de servicio aún no completado — no es ni
    // OK ni bloqueado, es un estado transicional (informativo, no negativo).
    if (estado === 'EN_ACUMULACION') return 'badge badge--info';
    return 'badge badge--secondary';
  }

  /**
   * Texto humanizado del estado de récord. "EN_ACUMULACION" se aclara explícitamente como
   * TIEMPO DE SERVICIO (primer año aún no completado) para no confundirse con F9.3
   * "Acumulación de períodos vacacionales" (columna aparte, concepto normativo distinto).
   */
  labelRecord(estado: string): string {
    if (estado === 'EN_ACUMULACION') return 'Acumulando tiempo de servicio';
    if (estado === 'SIN_RECORD_LEGAL') return 'Sin récord';
    return estado;
  }

  /** true si el empleado tiene días no computables (LSG o faltas) en el período. */
  tieneNoComputables(item: PadronVacacionalRowDto): boolean {
    return (item.diasNoComputablesLsg ?? 0) > 0 || (item.diasNoComputablesFaltas ?? 0) > 0;
  }

  /**
   * F9.3 — D.S. 013-2019-PCM: badge de "períodos acumulados sin gozar" (concepto DISTINTO
   * de EN_ACUMULACION/tiempo de servicio). Alerta visual a partir del 2° período; el 3° en
   * adelante NUNCA bloquea solo — pasa a requerir decisión documentada de RR.HH.
   */
  claseAcumulacion(item: PadronVacacionalRowDto): string {
    if (item.requiereDecisionAcumulacion) return 'badge badge--danger';
    if (item.periodosAcumuladosSinGozar >= 2) return 'badge badge--warning';
    return 'badge badge--secondary';
  }

  /** Texto explícito de unidad: el número es de PERÍODOS (años vacacionales), no días/meses. */
  labelPeriodosSinGozar(cantidad: number): string {
    return cantidad === 1 ? '1 período' : `${cantidad} períodos`;
  }

  abrirDecisionAcumulacion(item: PadronVacacionalRowDto): void {
    const dialogRef = this.dialog.open(AcumulacionDecisionDialogComponent, {
      width: '600px',
      data: item
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.apiService.registrarDecisionAcumulacion(item.empleadoId, result).subscribe({
          next: () => {
            this.notificacion.exito('Decisión de acumulación registrada correctamente');
            this.cargarPadron();
          },
          error: (err) => {
            const msg = err.error?.message || 'Error al registrar la decisión de acumulación';
            this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: 'error-snackbar' });
          }
        });
      }
    });
  }

  abrirDetalle(item: PadronVacacionalRowDto): void {
    this.dialog.open(VacacionDetalleDialogComponent, {
      width: '500px',
      data: item
    });
  }

  /** Trazabilidad Visual — historial completo (activos + anulados) del saldo del empleado. */
  abrirHistorialSaldo(item: PadronVacacionalRowDto): void {
    this.dialog.open(HistorialSaldoDialogComponent, {
      width: '800px',
      data: item
    });
  }

  abrirGoceDirecto(item: PadronVacacionalRowDto): void {
    const dialogRef = this.dialog.open(GoceDirectoDialogComponent, {
      width: '600px',
      data: item
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.apiService.registrarGoceDirecto(result).subscribe({
          next: () => {
            this.snackBar.open('Goce directo registrado correctamente', 'Cerrar', { duration: 3000 });
            this.cargarPadron();
          },
          error: (err) => {
            const msg = err.error?.message || 'Error al registrar goce directo';
            if (err.status === 400 && msg.includes('pool de 7')) {
              this.snackBar.open('¡RECHAZADO: ' + msg, 'Entendido', { duration: 10000, panelClass: 'error-snackbar' });
            } else {
              this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: 'error-snackbar' });
            }
          }
        });
      }
    });
  }

  /**
   * "Provisionar Auto": abre el diálogo de confirmación (sustento obligatorio, Poka-Yoke) y
   * recién entonces recalcula el saldo del empleado con el récord real. Las filas mal
   * calculadas se anulan (soft-delete) y se reemplazan por una fila nueva — nunca se editan
   * in-place. Nunca deja el saldo negativo.
   */
  provisionarAuto(item: PadronVacacionalRowDto): void {
    const dialogRef = this.dialog.open(ProvisionarAutoDialogComponent, {
      width: '600px',
      data: item
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.apiService.provisionarAuto(item.empleadoId, result).subscribe({
        next: (resp) => {
          this.notificacion.exito(this.mensajeRecalculo(resp.data));
          this.cargarPadron();
        },
        error: (err) => {
          const msg = err.error?.message || 'Error al provisionar el saldo del empleado';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: 'error-snackbar' });
        }
      });
    });
  }

  private mensajeRecalculo(resultado: RecalculoManualResult | undefined): string {
    const cambios = resultado?.cambios ?? [];
    if (cambios.length === 0) {
      return 'El saldo ya estaba correcto — sin cambios';
    }
    const detalle = cambios
      .map((c) =>
        c.tipo === 'CREADO'
          ? `${c.anio}: creado (${c.ganadosNuevo}d)`
          : `${c.anio}: anulado y corregido (${c.ganadosAnterior}d → ${c.ganadosNuevo}d)`
      )
      .join(' · ');
    return `Recálculo aplicado — ${detalle}`;
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.cargando.set(true);
      this.apiService.importarBaseline(file).subscribe({
        next: (resp) => {
          this.cargando.set(false);
          this.snackBar.open('Migración del Excel completada correctamente', 'Cerrar', { duration: 5000 });
          this.cargarPadron();
        },
        error: (err) => {
          this.cargando.set(false);
          const msg = err.error?.message || 'Error al procesar el archivo Excel';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: 'error-snackbar' });
        }
      });
      // reset input
      event.target.value = null;
    }
  }
}
