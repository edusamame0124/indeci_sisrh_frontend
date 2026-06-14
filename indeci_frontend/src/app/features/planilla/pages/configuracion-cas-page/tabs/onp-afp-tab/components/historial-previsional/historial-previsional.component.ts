import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ParametroPrevisionalApiService } from '../../../../../../services/parametro-previsional-api.service';
import type { HistorialPrevisionalRow } from '../../../../../../models/parametro-previsional.model';

/**
 * Pestaña Historial — lista cronológica de cambios en parámetros AFP/ONP.
 */
@Component({
  selector: 'app-historial-previsional',
  standalone: true,
  imports: [
    DatePipe,
    TitleCasePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial-previsional.component.html',
  styleUrl: './historial-previsional.component.css',
})
export class HistorialPrevisionalComponent implements OnInit {
  private readonly api = inject(ParametroPrevisionalApiService);

  readonly columns = ['fecha', 'tipo', 'afpNombre', 'accion', 'descripcion', 'periodoAfectado', 'usuario'] as const;
  readonly pageSizeOptions = [10, 20, 50] as const;

  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize  = signal(10);

  private readonly _rows = signal<readonly HistorialPrevisionalRow[]>([]);

  readonly pagedRows = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this._rows().slice(start, start + this.pageSize());
  });

  readonly rangoMostrado = computed(() => {
    const total = this._rows().length;
    const start = this.pageIndex() * this.pageSize() + 1;
    const end   = Math.min(this.pageIndex() * this.pageSize() + this.pageSize(), total);
    return { start, end, total };
  });

  readonly isEmpty = computed(() => this._rows().length === 0);

  ngOnInit(): void {
    this.cargar();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  refrescar(): void {
    this.cargar();
  }

  private cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.historial().subscribe({
      next: (rows) => { this._rows.set(rows); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el historial.'); this.loading.set(false); },
    });
  }
}
