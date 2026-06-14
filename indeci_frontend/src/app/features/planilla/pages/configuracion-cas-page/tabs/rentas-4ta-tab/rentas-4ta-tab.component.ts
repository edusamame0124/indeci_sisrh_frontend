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

export interface Rentas4taConfig {
  id: number;
  ejercicio: number;
  uit: number;
  tasaRetencion: number;
  topeAnualSoles: number;
  suspensionHabilitada: boolean;
  activo: boolean;
}

/**
 * Tab Rentas de 4ta categoría — parámetros de retención IR4ta
 * aplicables a trabajadores CAS del ejercicio anual.
 * Base normativa: TUO LIR Art. 33 inc. e) · D.S. 122-94-EF CAS.
 */
@Component({
  selector: 'app-rentas-4ta-tab',
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
  templateUrl: './rentas-4ta-tab.component.html',
  styleUrl: './rentas-4ta-tab.component.css',
})
export class Rentas4taTabComponent implements OnInit {
  readonly columns = [
    'ejercicio', 'uit', 'tasaRetencion', 'topeAnualSoles', 'suspensionHabilitada', 'estado', 'acciones',
  ] as const;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<readonly Rentas4taConfig[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  editar(row: Rentas4taConfig): void {
    // TODO: abrir dialog de edición de parámetros IR4ta
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
          ejercicio: 2026,
          uit: 5500.00,
          tasaRetencion: 8.00,
          topeAnualSoles: 41250.00,
          suspensionHabilitada: true,
          activo: true,
        },
        {
          id: 2,
          ejercicio: 2025,
          uit: 5350.00,
          tasaRetencion: 8.00,
          topeAnualSoles: 40125.00,
          suspensionHabilitada: true,
          activo: false,
        },
      ]);
      this.loading.set(false);
    }, 350);
  }
}
