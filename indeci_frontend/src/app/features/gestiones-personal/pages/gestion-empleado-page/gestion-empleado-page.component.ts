import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { EnviarPapeletaDialogComponent } from '../../../../modules/gestiones-personal/dialogs/enviar-papeleta-dialog/enviar-papeleta-dialog';
import { NuevaPapeletaDialogComponent } from '../../../../modules/gestiones-personal/dialogs/nueva-papeleta-dialog/nueva-papeleta-dialog';
import { TrazabilidadPapeletaDialogComponent } from '../../../../modules/gestiones-personal/dialogs/trazabilidad-papeleta-dialog/trazabilidad-papeleta-dialog';

import {
  SolicitudRrhh,
  SolicitudesRrhhService,
} from '../../../../modules/gestiones-personal/services/solicitudes-rrhh';

@Component({
  selector: 'app-gestion-empleado-page',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gestion-empleado-page.component.html',
  styleUrl: './gestion-empleado-page.component.css',
})
export class GestionEmpleadoPageComponent implements OnInit {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialog = inject(MatDialog);

  solicitudes = signal<SolicitudRrhh[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  filtroTexto = signal('');
  filtroEstado = signal('');
  filtroTipo = signal('');

  solicitudesFiltradas = computed(() => {
    const texto = this.filtroTexto().toLowerCase().trim();
    const estado = this.filtroEstado();
    const tipo = this.filtroTipo();

    return this.solicitudes()
      .filter((item) => {
        const coincideTexto =
          !texto ||
          item.tipoSolicitud?.toLowerCase().includes(texto) ||
          item.estadoSolicitud?.toLowerCase().includes(texto) ||
          item.motivo?.toLowerCase().includes(texto) ||
          item.observacion?.toLowerCase().includes(texto);

        const coincideEstado = !estado || item.estadoSolicitud === estado;
        const coincideTipo = !tipo || item.tipoSolicitud === tipo;

        return coincideTexto && coincideEstado && coincideTipo;
      })
      .sort((a, b) => b.id - a.id);
  });

  estados = computed(() =>
    [...new Set(this.solicitudes().map((x) => x.estadoSolicitud).filter(Boolean))],
  );

  tipos = computed(() =>
    [...new Set(this.solicitudes().map((x) => x.tipoSolicitud).filter(Boolean))],
  );

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.service.listarMisSolicitudes().subscribe({
      next: (resp) => {
        this.solicitudes.set(resp.data ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar las solicitudes del empleado.');
        this.cargando.set(false);
      },
    });
  }

  abrirNuevaPapeleta(): void {
  const ref = this.dialog.open(NuevaPapeletaDialogComponent, {
    width: '720px',
    maxWidth: '95vw',
    disableClose: true,
  });

  ref.afterClosed().subscribe((actualizar: boolean) => {
    if (actualizar) {
      this.cargarSolicitudes();
    }
  });
}

  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroEstado.set('');
    this.filtroTipo.set('');
  }

  descargarFormato(item: SolicitudRrhh): void {
    this.service.descargarFormatoPapeleta(item.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `Papeleta_${item.id}.pdf`;

        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudo generar la papeleta PDF.');
      },
    });
  }

  descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = nombreArchivo;
    link.click();

    window.URL.revokeObjectURL(url);
  }

 abrirEnvio(item: SolicitudRrhh): void {
  const ref = this.dialog.open(EnviarPapeletaDialogComponent, {
    width: '560px',
    maxWidth: '95vw',
    disableClose: true,
    data: item,
  });

  ref.afterClosed().subscribe((actualizar: boolean) => {
    if (actualizar) {
      this.cargarSolicitudes();
    }
  });
}

  abrirTrazabilidad(item: SolicitudRrhh): void {
  this.dialog.open(TrazabilidadPapeletaDialogComponent, {
    width: '960px',
    maxWidth: '96vw',
    data: item,
  });
}

  getNombreEmpleado(): string {
    return this.solicitudes()[0]?.empleado ?? 'Empleado';
  }

  claseEstado(estado: string): string {
    const valor = estado?.toLowerCase() ?? '';

    if (valor.includes('rrhh')) return 'badge badge--rrhh';
    if (valor.includes('jefe')) return 'badge badge--jefe';
    if (valor.includes('borrador')) return 'badge badge--borrador';
    if (valor.includes('rechaz')) return 'badge badge--rechazado';

    return 'badge';
  }
}