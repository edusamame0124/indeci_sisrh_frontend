import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { TransparenciaApiService } from '../../services/transparencia-api.service';
import type {
  TransparenciaPeriodo,
  TransparenciaRemuneracion,
} from '../../models/transparencia.model';

/**
 * Portal de Transparencia — Remuneraciones (Spec 011 / B4 — M10, Ley 27806).
 *
 * Página PÚBLICA (sin login): expone las remuneraciones del personal de los
 * períodos de planilla ya finalizados (APROBADO / CERRADO).
 */
@Component({
  selector: 'app-transparencia-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transparencia-page.component.html',
  styleUrl: './transparencia-page.component.css',
})
export class TransparenciaPageComponent implements OnInit {
  private readonly api = inject(TransparenciaApiService);

  readonly columns = ['empleado', 'regimen', 'remuneracionBruta'] as const;

  readonly periodos = signal<readonly TransparenciaPeriodo[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly remuneraciones = signal<readonly TransparenciaRemuneracion[]>([]);
  readonly loading = signal(true);
  readonly tableLoading = signal(false);
  readonly error = signal<string | null>(null);

  /** Total de la remuneración bruta publicada del período. */
  readonly totalBruto = computed(() =>
    this.remuneraciones().reduce((s, r) => s + (r.remuneracionBruta ?? 0), 0),
  );

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.cargarRemuneraciones(periodo);
  }

  private cargarPeriodos(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.periodos().subscribe({
      next: (rows) => {
        this.periodos.set(rows);
        this.loading.set(false);
        if (rows.length > 0) {
          this.onPeriodoChange(rows[0].periodo);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set('No se pudo cargar la información de transparencia.');
        void err;
      },
    });
  }

  private cargarRemuneraciones(periodo: string): void {
    this.tableLoading.set(true);
    this.error.set(null);
    this.api.remuneraciones(periodo).subscribe({
      next: (rows) => {
        this.remuneraciones.set(rows);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.remuneraciones.set([]);
        this.error.set('No se pudo cargar las remuneraciones del período.');
        void err;
      },
    });
  }
}
