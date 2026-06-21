import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { inject } from '@angular/core';
import { EssaludApiService } from '../../../../../../services/essalud-api.service';
import type { EssaludVigenciaRow } from '../../../../../../models/essalud.model';

@Component({
  selector: 'app-historial-essalud',
  standalone: true,
  imports: [DecimalPipe, SlicePipe, MatTableModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial-essalud.component.html',
  styleUrl: './historial-essalud.component.css',
})
export class HistorialEssaludComponent implements OnInit {
  private readonly api = inject(EssaludApiService);

  readonly columns = [
    'vigenciaInicio', 'vigenciaFin', 'uitVigente',
    'pctEssalud', 'baseMaximaCas', 'essaludMaximoCas',
    'fuenteOficial', 'estado', 'creadoPor', 'creadoEn',
  ] as const;

  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);
  readonly rows     = signal<readonly EssaludVigenciaRow[]>([]);
  readonly trackByRow = (_: number, r: EssaludVigenciaRow): number => r.id;

  ngOnInit(): void {
    this.api.listarVigencias({ incluirAnulados: true }).subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el historial.'); this.loading.set(false); },
    });
  }
}
