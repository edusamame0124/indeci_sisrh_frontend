import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { EmpleadoPuestoApiService } from '../../services/empleado-puesto-api.service';
import { PersonaPickerComponent } from '../../components/persona-picker/persona-picker.component';
import type { EmpleadoPuestoRow } from '../../models/empleado-puesto.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

/**
 * F5.1 — Cargo histórico del empleado en formato timeline.
 *
 * <p>Página compuesta por:</p>
 * <ol>
 *   <li>{@link PersonaPickerComponent} en la parte superior — autocomplete por
 *       nombre / DNI con debounce 250 ms. Al seleccionar persona dispara la
 *       carga del histórico.</li>
 *   <li>Timeline vertical con cards (un puesto por card) ordenadas del más
 *       reciente al más antiguo. Cada card muestra cargo, oficina, jefe,
 *       fechas y duración derivada en meses.</li>
 * </ol>
 *
 * <p>Ruta: {@code /empleados/cargo-historico}.</p>
 */
@Component({
  selector: 'app-cargo-historico-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PersonaPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cargo-historico-page.component.html',
  styleUrl: './cargo-historico-page.component.css',
})
export class CargoHistoricoPageComponent {
  private readonly puestoApi = inject(EmpleadoPuestoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  // ===================== State =====================

  readonly persona = signal<PersonaEmpleado | null>(null);
  readonly puestos = signal<readonly EmpleadoPuestoRow[]>([]);
  readonly loading = signal(false);

  readonly puestoActual = computed<EmpleadoPuestoRow | null>(() => {
    return this.puestos().find((p) => p.activo === 1) ?? null;
  });

  readonly historialAnterior = computed<readonly EmpleadoPuestoRow[]>(() => {
    return this.puestos().filter((p) => p.activo !== 1);
  });

  // ===================== Acciones =====================

  onPersonaSeleccionada(p: PersonaEmpleado): void {
    this.persona.set(p);
    if (p.empleadoId == null || p.empleadoId <= 0) {
      this.puestos.set([]);
      return;
    }
    this.cargarHistorial(p.empleadoId);
  }

  onPersonaLimpiar(): void {
    this.persona.set(null);
    this.puestos.set([]);
  }

  private cargarHistorial(empleadoId: number): void {
    this.loading.set(true);
    this.puestos.set([]);
    this.puestoApi.listar(empleadoId).subscribe({
      next: (rows) => {
        this.puestos.set(rows);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.puestos.set([]);
        const body = err.error;
        const msg = isErrorResponse(body)
          ? this.errors.translate(body.mensaje)
          : this.errors.translate(null);
        this.snack.open(msg, 'Cerrar', { duration: 7000 });
      },
    });
  }

  // ===================== Presentación =====================

  /** Calcula duración legible entre fechas — usa fecha actual si fechaFin null. */
  duracion(p: EmpleadoPuestoRow): string {
    const ini = p.fechaInicio ? new Date(p.fechaInicio + 'T00:00:00') : null;
    if (!ini) return '';
    const fin = p.fechaFin ? new Date(p.fechaFin + 'T00:00:00') : new Date();
    const meses =
      (fin.getFullYear() - ini.getFullYear()) * 12 +
      (fin.getMonth() - ini.getMonth());
    if (meses <= 0) return 'menos de 1 mes';
    if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    const sufAnios = anios === 1 ? 'año' : 'años';
    if (resto === 0) return `${anios} ${sufAnios}`;
    return `${anios} ${sufAnios} ${resto} ${resto === 1 ? 'mes' : 'meses'}`;
  }

  fmtFecha(iso: string | null | undefined): string {
    if (!iso) return '—';
    // ISO YYYY-MM-DD → DD/MM/YYYY (sin librería).
    const partes = iso.split('-');
    if (partes.length !== 3) return iso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
}
