import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { EmpleadoSaludEpsApiService } from '../../../../services/empleado-salud-eps-api.service';
import type { EmpleadoSaludEpsRow, EpsItem } from '../../../../models/empleado-salud-eps.model';
import { SaludEpsActualTabComponent } from '../../../empleado-salud-eps-page/components/salud-eps-actual-tab/salud-eps-actual-tab.component';
import { SaludEpsHistorialTabComponent } from '../../../empleado-salud-eps-page/components/salud-eps-historial-tab/salud-eps-historial-tab.component';
import { SaludEpsDocumentosTabComponent } from '../../../empleado-salud-eps-page/components/salud-eps-documentos-tab/salud-eps-documentos-tab.component';
import { SaludEpsAuditoriaTabComponent } from '../../../empleado-salud-eps-page/components/salud-eps-auditoria-tab/salud-eps-auditoria-tab.component';

@Component({
  selector: 'app-empleado-salud-integrado',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatTabsModule,
    MatIconModule,
    SaludEpsActualTabComponent,
    SaludEpsHistorialTabComponent,
    SaludEpsDocumentosTabComponent,
    SaludEpsAuditoriaTabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-salud-integrado.component.html',
  styles: `
    :host {
      display: block;
      font-family: var(--sisrh-font-sans, sans-serif);
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    .error-msg {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #9a3412;
      background: #fff7ed;
      padding: 1rem;
      border-radius: 6px;
      font-size: 0.95rem;
    }
    .hint {
      color: #64748b;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
  `,
})
export class EmpleadoSaludIntegradoComponent implements OnInit {
  readonly empleadoId = input.required<number>();
  readonly personaId = input.required<number>();
  readonly hasRecord = output<boolean>();

  private readonly api = inject(EmpleadoSaludEpsApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actual = signal<EmpleadoSaludEpsRow | null>(null);
  readonly historial = signal<readonly EmpleadoSaludEpsRow[]>([]);
  readonly epsList = signal<readonly EpsItem[]>([]);

  ngOnInit(): void {
    if (this.empleadoId() < 1) {
      this.loading.set(false);
      return;
    }
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.listarEps(this.empleadoId()).subscribe({
      next: (list: readonly EpsItem[]) => this.epsList.set(list),
    });

    this.api.historial(this.empleadoId()).subscribe({
      next: (rows: readonly EmpleadoSaludEpsRow[]) => {
        this.historial.set(rows);
        this.hasRecord.emit(rows.length > 0);
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
