import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';

import { EnviarPapeletaDialogComponent } from '../../../../modules/gestiones-personal/dialogs/enviar-papeleta-dialog/enviar-papeleta-dialog';
import { TrazabilidadPapeletaDialogComponent } from '../../../../modules/gestiones-personal/dialogs/trazabilidad-papeleta-dialog/trazabilidad-papeleta-dialog';

import { PermisoComunDialog } from '../../../../modules/gestiones-personal/dialogs/permiso-comun-dialog/permiso-comun-dialog';
import { LactanciaDialog } from '../../../../modules/gestiones-personal/dialogs/lactancia-dialog/lactancia-dialog';
import { LicenciaDialog } from '../../../../modules/gestiones-personal/dialogs/licencia-dialog/licencia-dialog';
import { DescansoMedicoDialog } from '../../../../modules/gestiones-personal/dialogs/descanso-medico-dialog/descanso-medico-dialog';
import { VacacionesDialog } from '../../../../modules/gestiones-personal/dialogs/vacaciones-dialog/vacaciones-dialog';
import { CompensacionDialog } from '../../../../modules/gestiones-personal/dialogs/compensacion-dialog/compensacion-dialog';

import {
  SolicitudRrhh,
  SolicitudesRrhhService,
  TipoSolicitudRrhh,
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
    MatMenuModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gestion-empleado-page.component.html',
  styleUrl: './gestion-empleado-page.component.scss',
})
export class GestionEmpleadoPageComponent implements OnInit {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialog = inject(MatDialog);

  tiposSolicitud = signal<TipoSolicitudRrhh[]>([]);
  cargandoTiposSolicitud = signal(false);

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

  estados = computed(() => [
    ...new Set(
      this.solicitudes()
        .map((x) => x.estadoSolicitud)
        .filter(Boolean),
    ),
  ]);

  tipos = computed(() => [
    ...new Set(
      this.solicitudes()
        .map((x) => x.tipoSolicitud)
        .filter(Boolean),
    ),
  ]);

  ngOnInit(): void {
    this.cargarSolicitudes();
    this.cargarTiposSolicitud();
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

  cargarTiposSolicitud(): void {
    this.cargandoTiposSolicitud.set(true);

    this.service.listarTiposSolicitud().subscribe({
      next: (resp) => {
        const activos = (resp.data ?? []).filter((tipo) => Number(tipo.activo) === 1);
        this.tiposSolicitud.set(activos);
        this.cargandoTiposSolicitud.set(false);
      },
      error: () => {
        this.cargandoTiposSolicitud.set(false);
        this.error.set('No se pudo cargar el catálogo de tipos de solicitud.');
      },
    });
  }

  buscarTipoPorCodigo(codigo: string): TipoSolicitudRrhh | null {
    const codigoNormalizado = String(codigo).padStart(3, '0');

    return (
      this.tiposSolicitud().find(
        (tipo) => String(tipo.codigo).padStart(3, '0') === codigoNormalizado,
      ) ?? null
    );
  }

  abrirDialogoPorCodigo(
    codigo: string,
    componente: any,
    width: string,
    extraData?: Record<string, unknown>,
  ): void {
    const tipoSolicitud = this.buscarTipoPorCodigo(codigo);

    if (!tipoSolicitud) {
      this.error.set(`No se encontró el tipo de solicitud con código ${codigo}.`);
      return;
    }

    const data = extraData
      ? {
          tipoSolicitud,
          ...extraData,
        }
      : tipoSolicitud;

    const ref = this.dialog.open(componente, {
      width,
      maxWidth: '95vw',
      disableClose: true,
      data,
    });

    ref.afterClosed().subscribe((actualizar: boolean) => {
      if (actualizar) {
        this.cargarSolicitudes();
      }
    });
  }

  // FORMATO 1: códigos 001 al 007
  abrirPermisoComun(codigo: string): void {
    this.abrirDialogoPorCodigo(codigo, PermisoComunDialog, '900px');
  }

  // FORMATO 2: códigos 008 y 009
  abrirLactancia(codigo: '008' | '009'): void {
    this.abrirDialogoPorCodigo(codigo, LactanciaDialog, '900px');
  }

  abrirDescansoMedico(expedidoPorNombre: string): void {
    this.abrirDialogoPorCodigo('010', DescansoMedicoDialog, '900px', {
      expedidoPorNombre,
    });
  }

  abrirLicencia(tipoLicenciaNombre: string): void {
    this.abrirDialogoPorCodigo('011', LicenciaDialog, '900px', {
      tipoLicenciaNombre,
    });
  }

  abrirVacaciones(tipoVacacionCodigo: string, tipoVacacionNombre: string): void {
    this.abrirDialogoPorCodigo('012', VacacionesDialog, '1100px', {
      tipoVacacionCodigo,
      tipoVacacionNombre,
    });
  }

  // FORMATO 6: código 013
  abrirCompensacion(): void {
    this.abrirDialogoPorCodigo('013', CompensacionDialog, '1100px');
  }

  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroEstado.set('');
    this.filtroTipo.set('');
  }

  descargarFormato(item: SolicitudRrhh): void {
    this.service.descargarFormatoPapeleta(item.id).subscribe({
      next: (blob) => {
        this.descargarBlob(blob, `Papeleta_${item.id}.pdf`);
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
    const primeraSolicitud = this.solicitudes()[0];
    return primeraSolicitud?.empleado ?? 'Empleado';
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
