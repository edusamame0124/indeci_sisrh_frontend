import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TeletrabajoDetalle, TeletrabajoReporte } from '../../models/teletrabajo.model';
import { TeletrabajoApiService } from '../../services/teletrabajo-api';

@Component({
  selector: 'app-teletrabajo-detalle-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './teletrabajo-detalle-page.html',
  styleUrl: './teletrabajo-detalle-page.scss',
})
export class TeletrabajoDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teletrabajoApi = inject(TeletrabajoApiService);

  readonly cargando = signal(false);
  readonly descargandoExcel = signal(false);
  readonly error = signal<string | null>(null);
  readonly reporte = signal<TeletrabajoReporte | null>(null);
  private readonly dialog = inject(MatDialog);
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!id || Number.isNaN(id)) {
      this.error.set('No se encontró un ID de reporte válido.');
      return;
    }

    this.cargarReporte(id);
  }

  cargarReporte(id: number): void {
    this.cargando.set(true);
    this.error.set(null);

    this.teletrabajoApi.obtenerReporte(id).subscribe({
      next: (reporte) => {
        this.reporte.set({
          ...reporte,
          detalles: reporte.detalles ?? [],
        });
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando reporte de teletrabajo:', err);
        this.error.set('No se pudo cargar el reporte de teletrabajo.');
        this.cargando.set(false);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/teletrabajo']);
  }

  agregarActividad(): void {
    const reporteActual = this.reporte();

    if (!reporteActual?.id) {
      this.error.set('No se encontró el reporte para agregar actividad.');
      return;
    }

    import('../../dialogs/teletrabajo-actividad-dialog/teletrabajo-actividad-dialog').then(
      ({ TeletrabajoActividadDialog }) => {
        const ref = this.dialog.open(TeletrabajoActividadDialog, {
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          disableClose: true,
          data: {
            reporteId: reporteActual.id,
            detalle: null,
          },
        });

        ref.afterClosed().subscribe((guardado) => {
          if (guardado) {
            this.cargarReporte(reporteActual.id);
          }
        });
      },
    );
  }

  editarActividad(detalle: TeletrabajoDetalle): void {
    const reporteActual = this.reporte();

    if (!reporteActual?.id || !detalle.id) {
      this.error.set('No se encontró la actividad para editar.');
      return;
    }

    import('../../dialogs/teletrabajo-actividad-dialog/teletrabajo-actividad-dialog').then(
      ({ TeletrabajoActividadDialog }) => {
        const ref = this.dialog.open(TeletrabajoActividadDialog, {
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          disableClose: true,
          data: {
            reporteId: reporteActual.id,
            detalle,
          },
        });

        ref.afterClosed().subscribe((guardado) => {
          if (guardado) {
            this.cargarReporte(reporteActual.id);
          }
        });
      },
    );
  }

  eliminarActividad(detalle: TeletrabajoDetalle): void {
    if (!detalle.id) {
      return;
    }

    const confirmado = window.confirm('¿Está seguro de eliminar esta actividad?');

    if (!confirmado) {
      return;
    }

    this.teletrabajoApi.eliminarDetalle(detalle.id).subscribe({
      next: () => {
        const reporteActual = this.reporte();

        if (reporteActual?.id) {
          this.cargarReporte(reporteActual.id);
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error eliminando actividad:', err);
        this.error.set('No se pudo eliminar la actividad.');
      },
    });
  }

  descargarExcel(): void {
    const reporteActual = this.reporte();

    if (!reporteActual?.id) {
      return;
    }

    this.descargandoExcel.set(true);
    this.error.set(null);

    this.teletrabajoApi.descargarExcel(reporteActual.id).subscribe({
      next: (blob) => {
        const file = new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = window.URL.createObjectURL(file);
        const link = document.createElement('a');

        link.href = url;
        link.download = `anexo_10_teletrabajo_${reporteActual.id}.xlsx`;
        link.click();

        window.URL.revokeObjectURL(url);
        this.descargandoExcel.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error descargando Excel:', err);
        this.error.set('No se pudo descargar el Excel del reporte.');
        this.descargandoExcel.set(false);
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
}
