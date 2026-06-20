import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Ir4taConfigApiService } from '../../../../../../services/ir4ta-config-api.service';
import type { Ir4taConfigRow } from '../../../../../../models/ir4ta-config.model';

export interface AuditoriaEvento {
  rowId: number;
  anioFiscal: number;
  accion: string;
  usuario: string;
  fecha: string;
  descripcion: string;
  tipo: 'crear' | 'modificar' | 'anular' | 'sistema';
}

@Component({
  selector: 'app-auditoria-ir4ta',
  standalone: true,
  imports: [DatePipe, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auditoria-ir4ta.component.html',
  styleUrl: './auditoria-ir4ta.component.css',
})
export class AuditoriaIr4taComponent implements OnInit {
  private readonly api = inject(Ir4taConfigApiService);

  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  private readonly _rows = signal<readonly Ir4taConfigRow[]>([]);

  readonly eventos = computed<readonly AuditoriaEvento[]>(() => {
    const list: AuditoriaEvento[] = [];

    for (const r of this._rows()) {
      list.push({
        rowId: r.id, anioFiscal: r.anioFiscal,
        accion: 'REGISTRÓ VIGENCIA', usuario: r.creadoPor, fecha: r.creadoEn,
        descripcion: `Año fiscal ${r.anioFiscal} — UIT S/ ${r.uitVigente.toFixed(2)} — ${r.fuenteOficial}`,
        tipo: 'crear',
      });

      if (r.modificadoPor && r.modificadoEn) {
        list.push({
          rowId: r.id, anioFiscal: r.anioFiscal,
          accion: 'MODIFICÓ VIGENCIA', usuario: r.modificadoPor, fecha: r.modificadoEn,
          descripcion: `Última modificación del registro ${r.anioFiscal} (estado: ${r.estado})`,
          tipo: 'modificar',
        });
      }

      if (r.estado === 'ANULADO') {
        list.push({
          rowId: r.id, anioFiscal: r.anioFiscal,
          accion: 'ANULÓ VIGENCIA', usuario: r.modificadoPor ?? '—', fecha: r.modificadoEn ?? r.creadoEn,
          descripcion: `Vigencia ${r.anioFiscal} marcada como ANULADA.`,
          tipo: 'anular',
        });
      }

      if (r.estado === 'VIGENTE') {
        list.push({
          rowId: r.id, anioFiscal: r.anioFiscal,
          accion: 'PUBLICÓ VIGENCIA', usuario: r.modificadoPor ?? r.creadoPor, fecha: r.modificadoEn ?? r.creadoEn,
          descripcion: `Vigencia ${r.anioFiscal} pasó a VIGENTE. Aplicable en motor de planilla.`,
          tipo: 'sistema',
        });
      }

      if (r.estado === 'CERRADO') {
        list.push({
          rowId: r.id, anioFiscal: r.anioFiscal,
          accion: 'CERRÓ VIGENCIA', usuario: r.modificadoPor ?? r.creadoPor, fecha: r.modificadoEn ?? r.creadoEn,
          descripcion: `Vigencia ${r.anioFiscal} cerrada. Período fiscal concluido.`,
          tipo: 'sistema',
        });
      }
    }

    return list.sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  ngOnInit(): void { this.cargar(); }

  iconForTipo(tipo: AuditoriaEvento['tipo']): string {
    const m: Record<string, string> = {
      crear: 'add_circle_outline', modificar: 'edit',
      anular: 'cancel', sistema: 'verified',
    };
    return m[tipo] ?? 'info';
  }

  private cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listar({ incluirAnulados: true }).subscribe({
      next:  (rows) => { this._rows.set(rows); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar la auditoría.'); this.loading.set(false); },
    });
  }
}
