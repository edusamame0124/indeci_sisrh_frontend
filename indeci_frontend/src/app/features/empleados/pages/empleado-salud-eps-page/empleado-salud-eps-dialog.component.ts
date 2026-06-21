import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { EmpleadoSaludEpsApiService } from '../../services/empleado-salud-eps-api.service';
import type {
  EmpleadoSaludEpsRow,
  EpsItem,
} from '../../models/empleado-salud-eps.model';
import { SaludEpsActualTabComponent } from './components/salud-eps-actual-tab/salud-eps-actual-tab.component';
import { SaludEpsHistorialTabComponent } from './components/salud-eps-historial-tab/salud-eps-historial-tab.component';
import { SaludEpsDocumentosTabComponent } from './components/salud-eps-documentos-tab/salud-eps-documentos-tab.component';
import { SaludEpsAuditoriaTabComponent } from './components/salud-eps-auditoria-tab/salud-eps-auditoria-tab.component';

export interface EmpleadoSaludEpsDialogData {
  empleadoId: number;
  nombreCompleto: string;
  dni: string;
  regimenLaboral?: string | number | null;
}

@Component({
  selector: 'app-empleado-salud-eps-dialog',
  standalone: true,
  imports: [
    MatDialogModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTabsModule,
    SaludEpsActualTabComponent,
    SaludEpsHistorialTabComponent,
    SaludEpsDocumentosTabComponent,
    SaludEpsAuditoriaTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-salud-eps-dialog.component.html',
  styleUrl: './empleado-salud-eps-dialog.component.css',
})
export class EmpleadoSaludEpsDialogComponent implements OnInit {
  readonly data = inject<EmpleadoSaludEpsDialogData>(MAT_DIALOG_DATA);
  private readonly api = inject(EmpleadoSaludEpsApiService);

  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);
  readonly actual    = signal<EmpleadoSaludEpsRow | null>(null);
  readonly historial = signal<readonly EmpleadoSaludEpsRow[]>([]);
  readonly epsList   = signal<readonly EpsItem[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.listarEps(this.data.empleadoId).subscribe({
      next: (list: readonly EpsItem[]) => this.epsList.set(list),
    });

    this.api.historial(this.data.empleadoId).subscribe({
      next: (rows: readonly EmpleadoSaludEpsRow[]) => {
        this.historial.set(rows);
        const activo = rows.find((r) => r.estado === 'ACTIVO') ?? null;
        this.actual.set(activo);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message ?? 'Error al cargar la configuración Salud/EPS.');
        this.loading.set(false);
      },
    });
  }

  onGuardado(): void {
    this.cargar();
  }
}
