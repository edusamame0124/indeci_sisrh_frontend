import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface EssaludConfig {
  id: number;
  concepto: string;
  baseCalculo: string;
  tasa: number;
  topeBase: number | null;
  montoMinimo: number;
  activo: boolean;
}

/**
 * Tab ESSALUD — tasa de aportación de salud del empleador
 * para trabajadores CAS del ejercicio anual.
 * Base normativa: D.S. 009-97-SA, ESSALUD 9% a cargo del empleador.
 */
@Component({
  selector: 'app-essalud-tab',
  standalone: true,
  imports: [
    DecimalPipe,
    CurrencyPipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './essalud-tab.component.html',
  styleUrl: './essalud-tab.component.css',
})
export class EssaludTabComponent implements OnInit {
  readonly columns = [
    'concepto', 'baseCalculo', 'tasa', 'topeBase', 'montoMinimo', 'estado', 'acciones',
  ] as const;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<readonly EssaludConfig[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  editar(row: EssaludConfig): void {
    // TODO: abrir dialog de edición de tasa ESSALUD
    console.log('editar', row);
  }

  private cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    // TODO: reemplazar con ParametroRemunerativoApiService
    setTimeout(() => {
      this.rows.set([
        {
          id: 1,
          concepto: 'EsSalud — Aporte empleador CAS',
          baseCalculo: 'Remuneración mensual',
          tasa: 9.00,
          topeBase: null,
          montoMinimo: 92.25,
          activo: true,
        },
      ]);
      this.loading.set(false);
    }, 350);
  }
}
