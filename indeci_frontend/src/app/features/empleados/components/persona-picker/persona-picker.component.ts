import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  type MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { PersonaApiService } from '../../services/persona-api.service';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

/**
 * F5 — Selector horizontal de persona con autocomplete dinámico.
 *
 * <p>Compartido por F5.1 (Cargo histórico) y como utilidad para otras pantallas.
 * Diseño: barra superior con autocomplete (debounce 250ms) que filtra por
 * nombre y/o DNI. Al seleccionar emite la persona elegida. Si ya hay persona
 * activa muestra "chip" con DNI + nombre y un botón "Cambiar persona" para
 * volver al modo búsqueda.</p>
 *
 * <p>UI/UX aplicado (ui-ux-pro-max + sisrh-design-system):</p>
 * <ul>
 *   <li>Debounce 250ms entre tecla y filtrado (rango 200-300ms).</li>
 *   <li>Top 12 resultados visibles para evitar listas largas.</li>
 *   <li>Texto secundario con DNI tabular-nums.</li>
 *   <li>Empty state cuando no hay coincidencias.</li>
 *   <li>`aria-label` explícito en el input + lista accesible.</li>
 * </ul>
 */
@Component({
  selector: 'app-persona-picker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './persona-picker.component.html',
  styleUrl: './persona-picker.component.css',
})
export class PersonaPickerComponent {
  private readonly personaApi = inject(PersonaApiService);

  /** Subtítulo legible bajo el campo de búsqueda. */
  readonly hint = input<string>(
    'Selecciona una persona para continuar.',
  );

  /** Solo personas con empleadoId (typ para módulos que requieren empleado). */
  readonly soloEmpleados = input<boolean>(true);

  /** Persona seleccionada actual (input controlado opcional). */
  readonly selected = input<PersonaEmpleado | null>(null);

  /** Emite al seleccionar persona del autocomplete. */
  @Output() readonly seleccionar = new EventEmitter<PersonaEmpleado>();

  /** Emite al limpiar la selección activa. */
  @Output() readonly limpiar = new EventEmitter<void>();

  // ===================== State =====================

  /** Control del input — recibe texto crudo del usuario. */
  readonly query = new FormControl<string>('', { nonNullable: true });

  readonly loading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly personas = signal<readonly PersonaEmpleado[]>([]);

  /** Estado actual del input (signal) con debounce. */
  private readonly queryDebounced = toSignal(
    this.query.valueChanges.pipe(
      startWith(this.query.value),
      debounceTime(250),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );

  /** Lista filtrada por nombre o DNI (case-insensitive, sin acentos básico). */
  readonly opciones = computed<readonly PersonaEmpleado[]>(() => {
    const q = (this.queryDebounced() ?? '').trim().toLowerCase();
    let base = this.personas();
    if (this.soloEmpleados()) {
      base = base.filter((p) => p.empleadoId != null && p.empleadoId > 0);
    }
    if (!q) {
      return [...base]
        .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es-PE'))
        .slice(0, 12);
    }
    return base
      .filter((p) => {
        const blob = `${p.nombreCompleto} ${p.dni} ${p.codigoInterno ?? ''}`.toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 12);
  });

  constructor() {
    this.cargarPersonas();
  }

  // ===================== Acciones =====================

  cargarPersonas(): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.personaApi.listar().subscribe({
      next: (rows) => {
        this.personas.set(rows);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMsg.set(
          err?.status === 0
            ? 'No se pudo contactar al servidor. Intenta nuevamente.'
            : 'No se pudo cargar el listado de personas.',
        );
      },
    });
  }

  onSelectOption(ev: MatAutocompleteSelectedEvent): void {
    const persona = ev.option.value as PersonaEmpleado | null;
    if (persona) {
      this.seleccionar.emit(persona);
      // Limpiar el input para no dejar texto residual cuando se renderiza el chip.
      this.query.setValue('', { emitEvent: false });
    }
  }

  onCambiarPersona(): void {
    this.limpiar.emit();
    this.query.setValue('', { emitEvent: false });
  }

  // ===================== Presentación =====================

  /**
   * `displayWith` del autocomplete — nunca muestra la persona en el input
   * porque el patrón es chip-on-select. Devuelve string vacío.
   */
  displayPersona = (_p: PersonaEmpleado | null): string => '';
}
