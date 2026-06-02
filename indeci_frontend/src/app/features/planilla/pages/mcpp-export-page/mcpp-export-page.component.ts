import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, of } from 'rxjs';
import { PeriodoPlanillaApiService } from '../../services/periodo-planilla-api.service';
import { McppApiService } from '../../services/mcpp-api.service';
import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';
import type { McppPlanillaDisponible, McppTipoPlanilla } from '../../models/mcpp-export.model';

const TIPO_LABEL: Record<string, string> = {
  '01': 'SERVIR',
  '03': 'CAS',
  '12': 'Judiciales',
};

@Component({
  selector: 'app-mcpp-export-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mcpp-export-page.component.html',
  styleUrl: './mcpp-export-page.component.css',
})
export class McppExportPageComponent {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly mcppApi    = inject(McppApiService);

  readonly loading          = signal(true);
  readonly loadingPlanillas = signal(false);
  readonly downloading      = signal<string | null>(null);
  readonly periodos         = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly selectedPeriodo  = signal<string | null>(null);
  readonly planillas        = signal<readonly McppPlanillaDisponible[]>([]);

  readonly columns = ['tipo', 'nroPlanilla', 'totalRegistros', 'totalIngresos', 'totalDescuentos', 'acciones'];

  constructor() {
    this.periodoApi.listar()
      .pipe(catchError(() => of([] as readonly PeriodoPlanillaRow[])))
      .subscribe(rows => {
        const activos = [...rows].filter(p => p.activo === 1).reverse();
        this.periodos.set(activos);
        if (activos.length > 0) this.seleccionarPeriodo(activos[0].periodo);
        this.loading.set(false);
      });
  }

  seleccionarPeriodo(periodo: string): void {
    this.selectedPeriodo.set(periodo);
    this.loadingPlanillas.set(true);
    this.planillas.set([]);
    this.mcppApi.listarPlanillas(periodo)
      .pipe(catchError(() => of([] as readonly McppPlanillaDisponible[])))
      .subscribe(rows => {
        this.planillas.set(rows);
        this.loadingPlanillas.set(false);
      });
  }

  descargarTipo(tipo: McppTipoPlanilla): void {
    const periodo = this.selectedPeriodo();
    if (!periodo || this.downloading()) return;
    this.downloading.set(tipo);
    this.mcppApi.descargarTipo(periodo, tipo).subscribe({
      next: blob => { this.triggerDownload(blob, `PLL${tipo}_${periodo.replace('-', '')}.TXT`); this.downloading.set(null); },
      error: () => this.downloading.set(null),
    });
  }

  descargarZip(): void {
    const periodo = this.selectedPeriodo();
    if (!periodo || this.downloading()) return;
    this.downloading.set('zip');
    this.mcppApi.descargarZip(periodo).subscribe({
      next: blob => { this.triggerDownload(blob, `mcpp-${periodo.replace('-', '')}.zip`); this.downloading.set(null); },
      error: () => this.downloading.set(null),
    });
  }

  tipoLabel(tipo: string): string { return TIPO_LABEL[tipo] ?? tipo; }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
