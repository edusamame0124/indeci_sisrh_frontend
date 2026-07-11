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
import { PadronVacacionalRowDto } from '../../models/padron-vacacional.model';
import { VacacionDetalleDialogComponent } from '../vacacion-detalle-dialog/vacacion-detalle-dialog.component';
import { GoceDirectoDialogComponent } from '../goce-directo-dialog/goce-directo-dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    return 'badge badge--secondary';
  }

  /** true si el empleado tiene días no computables (LSG o faltas) en el período. */
  tieneNoComputables(item: PadronVacacionalRowDto): boolean {
    return (item.diasNoComputablesLsg ?? 0) > 0 || (item.diasNoComputablesFaltas ?? 0) > 0;
  }

  abrirDetalle(item: PadronVacacionalRowDto): void {
    this.dialog.open(VacacionDetalleDialogComponent, {
      width: '500px',
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
