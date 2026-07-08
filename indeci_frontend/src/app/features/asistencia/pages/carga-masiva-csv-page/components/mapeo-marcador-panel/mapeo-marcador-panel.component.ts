import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { PersonaPickerComponent } from '../../../../../empleados/components/persona-picker/persona-picker.component';
import type { PersonaEmpleado } from '../../../../../empleados/models/persona-empleado.model';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import { AsistenciaImportApiService } from '../../../../services/asistencia-import-api.service';
import type { MarcadorSinMapeo } from '../../../../models/asistencia-import.model';

/**
 * Panel de mapeo de identidad del marcador COEN (SPEC D1 / F2).
 *
 * Lista los nombres del reporte que NO se pudieron asociar a un empleado y deja
 * mapearlos uno por uno (reutiliza {@link PersonaPickerComponent}). Al mapear, el
 * padre puede re-generar la vista previa para que esos días ya se calculen. Si la
 * persona no existe en el sistema, se ofrece registrarla en Empleados (M03).
 */
@Component({
  selector: 'app-mapeo-marcador-panel',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
    PersonaPickerComponent,
  ],
  templateUrl: './mapeo-marcador-panel.component.html',
  styleUrl: './mapeo-marcador-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapeoMarcadorPanelComponent {
  private readonly api = inject(AsistenciaImportApiService);
  private readonly noti = inject(NotificacionService);
  private readonly snack = inject(MatSnackBar);

  readonly importacionId = input.required<number>();

  /** Emite cuando se mapeó ≥1 nombre; el padre puede re-generar el preview. */
  @Output() readonly mapeado = new EventEmitter<void>();

  readonly items = signal<readonly MarcadorSinMapeo[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  /** Nombre cuya fila tiene abierto el buscador de empleado. */
  readonly mapeandoNombre = signal<string | null>(null);

  readonly total = computed(() => this.items().length);

  constructor() {
    effect(() => {
      const id = this.importacionId();
      if (id != null) {
        this.cargar(id);
      }
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.api.sinMapeo(id).subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.items.set([]);
        this.cargando.set(false);
      },
    });
  }

  iniciarMapeo(nombre: string): void {
    this.mapeandoNombre.set(nombre);
  }

  cancelarMapeo(): void {
    this.mapeandoNombre.set(null);
  }

  onSeleccionar(nombre: string, persona: PersonaEmpleado): void {
    const empleadoId = persona.empleadoId;
    if (empleadoId == null || empleadoId <= 0) {
      this.snack.open(
        'La persona seleccionada no tiene un empleado asociado. Regístrela en Empleados.',
        'Cerrar',
        { duration: 6000 },
      );
      return;
    }
    this.guardando.set(true);
    this.api.mapearAlias({ empleadoId, nombreMarcador: nombre }).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.nombreMarcador !== nombre));
        this.mapeandoNombre.set(null);
        this.guardando.set(false);
        this.noti.exito(`"${nombre}" quedó mapeado. Regenere la vista previa para recalcular.`);
        this.mapeado.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        const msg = err?.status === 0
          ? 'No se pudo contactar al servidor.'
          : 'No se pudo mapear el nombre. Intente nuevamente.';
        this.snack.open(msg, 'Cerrar', { duration: 6000 });
      },
    });
  }
}
