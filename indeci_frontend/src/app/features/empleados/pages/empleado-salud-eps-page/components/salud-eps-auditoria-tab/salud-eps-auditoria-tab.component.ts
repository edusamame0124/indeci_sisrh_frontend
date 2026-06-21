import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import type { EmpleadoSaludEpsRow } from '../../../../models/empleado-salud-eps.model';

interface AuditoriaEntry {
  fecha: string | null;
  usuario: string | null;
  accion: string;
  estado: string;
  detalle: string;
  motivo: string | null;
}

@Component({
  selector: 'app-salud-eps-auditoria-tab',
  standalone: true,
  imports: [DatePipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salud-eps-auditoria-tab.component.html',
  styleUrl: './salud-eps-auditoria-tab.component.css',
})
export class SaludEpsAuditoriaTabComponent {
  @Input() rows: readonly EmpleadoSaludEpsRow[] = [];

  get entradas(): AuditoriaEntry[] {
    const result: AuditoriaEntry[] = [];
    for (const r of this.rows) {
      result.push({
        fecha:   r.creadoEn,
        usuario: r.creadoPor,
        accion:  'REGISTRO COBERTURA SALUD',
        estado:  r.estado,
        detalle: `Tipo: ${r.tipoCobertura === 'ESSALUD' ? 'Solo EsSalud (9%)' : 'EsSalud + EPS'}${r.epsNombre ? ' — ' + r.epsNombre : ''}. Desde: ${r.fechaInicio}${r.fechaFin ? ' hasta: ' + r.fechaFin : ''}.`,
        motivo:  null,
      });
      if (r.modificadoEn && r.modificadoPor && r.estado !== 'ANULADO') {
        result.push({
          fecha:   r.modificadoEn,
          usuario: r.modificadoPor,
          accion:  'MODIFICACION COBERTURA SALUD',
          estado:  r.estado,
          detalle: 'Modificación de datos de cobertura.',
          motivo:  null,
        });
      }
      if (r.estado === 'CERRADO' && r.modificadoPor) {
        result.push({
          fecha:   r.modificadoEn,
          usuario: r.modificadoPor,
          accion:  'CIERRE COBERTURA SALUD',
          estado:  'CERRADO',
          detalle: 'Vigencia cerrada.',
          motivo:  null,
        });
      }
      if (r.estado === 'ANULADO' && r.anuladoEn) {
        result.push({
          fecha:   r.anuladoEn,
          usuario: r.anuladoPor,
          accion:  'ANULACION COBERTURA SALUD',
          estado:  'ANULADO',
          detalle: 'Cobertura anulada. No será usada por el motor de planilla.',
          motivo:  r.motivoAnulacion,
        });
      }
    }
    return result.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
  }

  iconAccion(accion: string): string {
    if (accion.startsWith('REGISTRO'))    return 'add_circle';
    if (accion.startsWith('MODIFICACION')) return 'edit';
    if (accion.startsWith('CIERRE'))      return 'lock';
    if (accion.startsWith('ANULACION'))   return 'block';
    return 'history';
  }

  colorAccion(accion: string): string {
    if (accion.startsWith('REGISTRO'))    return 'icon--success';
    if (accion.startsWith('MODIFICACION')) return 'icon--info';
    if (accion.startsWith('CIERRE'))      return 'icon--warn';
    if (accion.startsWith('ANULACION'))   return 'icon--danger';
    return '';
  }
}
