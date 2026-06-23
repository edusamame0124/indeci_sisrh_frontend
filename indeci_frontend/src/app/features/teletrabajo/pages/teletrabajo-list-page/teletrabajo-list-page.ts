import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TeletrabajoApiService } from '../../services/teletrabajo-api';
import { TeletrabajoResumen } from '../../models/teletrabajo.model';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
@Component({
  selector: 'app-teletrabajo-list-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,

    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './teletrabajo-list-page.html',
  styleUrl: './teletrabajo-list-page.scss',
})
export class TeletrabajoListPage implements OnInit {
  private readonly teletrabajoApi = inject(TeletrabajoApiService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly reportes = signal<TeletrabajoResumen[]>([]);

  private readonly dialog = inject(MatDialog);

  readonly filtroTexto = signal('');
  readonly filtroMes = signal<number | null>(null);
  readonly filtroAnio = signal<number | null>(null);

  readonly meses = [
    { id: 1, nombre: 'Enero' },
    { id: 2, nombre: 'Febrero' },
    { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' },
    { id: 5, nombre: 'Mayo' },
    { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' },
    { id: 8, nombre: 'Agosto' },
    { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' },
    { id: 11, nombre: 'Noviembre' },
    { id: 12, nombre: 'Diciembre' },
  ];

  ngOnInit(): void {
    this.cargarReportes();
  }

  cargarReportes(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.teletrabajoApi.listarReportes().subscribe({
      next: (reportes) => {
        this.reportes.set(reportes ?? []);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando reportes de teletrabajo:', err);
        this.error.set('No se pudieron cargar los reportes de teletrabajo.');
        this.cargando.set(false);
      },
    });
  }

  nuevoReporte(): void {
    import('../../dialogs/teletrabajo-cabecera-dialog/teletrabajo-cabecera-dialog').then(
      ({ TeletrabajoCabeceraDialog }) => {
        const ref = this.dialog.open(TeletrabajoCabeceraDialog, {
          width: '820px',
          maxWidth: '95vw',
          maxHeight: '92vh',
          disableClose: true,
        });

        ref.afterClosed().subscribe((reporteId?: number | null) => {
          if (reporteId) {
            this.router.navigate(['/teletrabajo', reporteId]);
          }
        });
      },
    );
  }

  verDetalle(reporte: TeletrabajoResumen): void {
    this.router.navigate(['/teletrabajo', reporte.id]);
  }

  descargarExcel(reporte: TeletrabajoResumen): void {
    if (!reporte.id) {
      return;
    }

    this.teletrabajoApi.descargarExcel(reporte.id).subscribe({
      next: (blob) => {
        const file = new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = window.URL.createObjectURL(file);
        const link = document.createElement('a');

        link.href = url;
        link.download = `reporte_teletrabajo_${reporte.id}.xlsx`;
        link.click();

        window.URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error descargando Excel:', err);
        this.error.set('No se pudo descargar el Excel del reporte.');
      },
    });
  }

  eliminarReporte(reporte: TeletrabajoResumen): void {
    if (!reporte.id) {
      return;
    }

    const confirmado = window.confirm('¿Está seguro de eliminar este reporte de teletrabajo?');

    if (!confirmado) {
      return;
    }

    this.teletrabajoApi.eliminarReporte(reporte.id).subscribe({
      next: () => {
        this.cargarReportes();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error eliminando reporte:', err);
        this.error.set('No se pudo eliminar el reporte de teletrabajo.');
      },
    });
  }

  nombreMes(mes: number | null | undefined): string {
    const meses = [
      '',
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    if (!mes || mes < 1 || mes > 12) {
      return '-';
    }

    return meses[mes];
  }

  trabajadorTexto(reporte: TeletrabajoResumen): string {
    return reporte.trabajador || `Empleado ID: ${reporte.empleadoId}`;
  }

  reportesFiltrados(): TeletrabajoResumen[] {
    const texto = this.filtroTexto().trim().toUpperCase();
    const mes = this.filtroMes();
    const anio = this.filtroAnio();

    return this.reportes().filter((reporte) => {
      const trabajador = this.trabajadorTexto(reporte).toUpperCase();
      const modalidad = (reporte.modalidad || '').toUpperCase();
      const estado = (reporte.estado || '').toUpperCase();

      const coincideTexto =
        !texto ||
        trabajador.includes(texto) ||
        modalidad.includes(texto) ||
        estado.includes(texto) ||
        String(reporte.empleadoId || '').includes(texto);

      const coincideMes = !mes || reporte.mes === mes;
      const coincideAnio = !anio || reporte.anio === anio;

      return coincideTexto && coincideMes && coincideAnio;
    });
  }
  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroMes.set(null);
    this.filtroAnio.set(null);
  }
}
