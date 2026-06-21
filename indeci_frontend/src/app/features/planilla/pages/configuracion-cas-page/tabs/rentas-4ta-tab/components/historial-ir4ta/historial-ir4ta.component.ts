import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Ir4taConfigApiService } from '../../../../../../services/ir4ta-config-api.service';
import type { Ir4taConfigRow } from '../../../../../../models/ir4ta-config.model';

@Component({
  selector: 'app-historial-ir4ta',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial-ir4ta.component.html',
  styleUrl: './historial-ir4ta.component.css',
})
export class HistorialIr4taComponent implements OnInit {
  private readonly api = inject(Ir4taConfigApiService);

  readonly columns = [
    'anioFiscal', 'vigenciaInicio', 'vigenciaFin',
    'uitVigente', 'estado', 'fuenteOficial',
    'creadoPor', 'creadoEn', 'modificadoEn',
  ] as const;

  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize  = signal(10);

  private readonly _rows = signal<readonly Ir4taConfigRow[]>([]);

  readonly pagedRows = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this._rows().slice(start, start + this.pageSize());
  });

  readonly rangoMostrado = computed(() => {
    const total = this._rows().length;
    const start = this.pageIndex() * this.pageSize() + 1;
    const end   = Math.min(start + this.pageSize() - 1, total);
    return { start, end, total };
  });

  ngOnInit(): void { this.cargar(); }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  private cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listar({ incluirAnulados: true }).subscribe({
      next:  (rows) => { this._rows.set(rows); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el historial.'); this.loading.set(false); },
    });
  }
}
