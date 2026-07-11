import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';

import {
  SolicitudRrhh,
  SolicitudesRrhhService,
} from '../../../../modules/gestiones-personal/services/solicitudes-rrhh';

import { AprobarRrhhPapeletaDialogComponent } from '../../../../modules/gestiones-personal/dialogs/aprobar-rrhh-papeleta-dialog/aprobar-rrhh-papeleta-dialog';

import { TrazabilidadPapeletaDialogComponent } from '../../../../modules/gestiones-personal/dialogs/trazabilidad-papeleta-dialog/trazabilidad-papeleta-dialog';

import { PadronVacacionalTabComponent } from '../../components/padron-vacacional-tab/padron-vacacional-tab.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-gestion-rrhh-page',
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
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    PadronVacacionalTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gestion-rrhh-page.component.html',
  styleUrl: './gestion-rrhh-page.component.css',
})
export class GestionRrhhPageComponent implements OnInit {
  private readonly service = inject(SolicitudesRrhhService);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  /**
   * Aprobar/Rechazar papeletas RRHH exige el permiso de APROBACIÓN (SoD): el
   * analista opera el módulo (PAP_RRHH) pero no aprueba. El backend además lo
   * exige con @PreAuthorize('PAP_APROBAR_RRHH') como fuente de verdad.
   */
  readonly puedeAprobarRrhh = computed(() => this.auth.permisos().includes('PAP_APROBAR_RRHH'));

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
          item.empleado?.toLowerCase().includes(texto) ||
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

    this.service.listarTodasSolicitudes().subscribe({
      next: (resp) => {
        this.solicitudes.set(resp.data ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar las papeletas para RRHH.');
        this.cargando.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroEstado.set('');
    this.filtroTipo.set('');
  }

  abrirAprobar(item: SolicitudRrhh): void {
    const ref = this.dialog.open(AprobarRrhhPapeletaDialogComponent, {
      width: '620px',
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

  claseEstado(estado: string): string {
    const valor = estado?.toLowerCase() ?? '';

    if (valor.includes('rrhh')) return 'badge badge--rrhh';
    if (valor.includes('jefe')) return 'badge badge--jefe';
    if (valor.includes('empleado')) return 'badge badge--empleado';
    if (valor.includes('rechaz')) return 'badge badge--rechazado';

    return 'badge';
  }
}