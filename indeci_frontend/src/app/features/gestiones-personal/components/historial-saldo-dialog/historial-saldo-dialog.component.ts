import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PadronVacacionalApiService } from '../../services/padron-vacacional-api.service';
import { HistorialSaldoRow, PadronVacacionalRowDto } from '../../models/padron-vacacional.model';

@Component({
  selector: 'app-historial-saldo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial-saldo-dialog.component.html',
  styleUrl: './historial-saldo-dialog.component.css'
})
export class HistorialSaldoDialogComponent implements OnInit {
  readonly data = inject<PadronVacacionalRowDto>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<HistorialSaldoDialogComponent>);
  private readonly apiService = inject(PadronVacacionalApiService);
  private readonly datePipe = inject(DatePipe);

  cargando = signal(false);
  filas = signal<HistorialSaldoRow[]>([]);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargando.set(true);
    this.apiService.historialSaldo(this.data.empleadoId).subscribe({
      next: (resp) => {
        this.filas.set(resp.data ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el historial de saldo.');
        this.cargando.set(false);
      }
    });
  }

  formatearFecha(fecha: string): string {
    return this.datePipe.transform(fecha, 'dd/MM/yyyy HH:mm') ?? fecha;
  }

  esActivo(fila: HistorialSaldoRow): boolean {
    return fila.activo === 1;
  }
}
