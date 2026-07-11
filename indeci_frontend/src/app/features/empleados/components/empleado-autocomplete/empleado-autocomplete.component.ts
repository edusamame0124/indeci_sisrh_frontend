import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

/**
 * Combobox institucional de empleado: buscador dinámico + select a la vez.
 *
 * <p>Presentacional y reutilizable (DRY). Filtra por nombre o DNI (sin acentos),
 * muestra opciones a dos líneas y permite limpiar. Trabaja con el `empleadoId`:
 * el padre pasa la lista y el id seleccionado, y recibe el id elegido por output
 * (`selectedIdChange`), lo que encaja tanto con signals como con Reactive Forms.
 */
@Component({
  selector: 'app-empleado-autocomplete',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" class="ea-field">
      <mat-label>{{ label() }}</mat-label>
      <mat-icon matPrefix fontIcon="search" aria-hidden="true" class="ea-pref" />
      <input
        matInput
        type="text"
        [placeholder]="placeholder()"
        [matAutocomplete]="auto"
        [ngModel]="busqueda()"
        (ngModelChange)="busqueda.set($event)"
        [attr.aria-label]="label()"
      />
      @if (haySeleccion()) {
        <button
          matSuffix
          mat-icon-button
          type="button"
          (click)="limpiar()"
          aria-label="Limpiar selección"
        >
          <mat-icon fontIcon="close" aria-hidden="true" />
        </button>
      }
      <mat-autocomplete
        #auto="matAutocomplete"
        [displayWith]="displayEmpleado"
        (optionSelected)="onSeleccion($event.option.value)"
      >
        @for (e of opciones(); track e.empleadoId) {
          <mat-option [value]="e">
            <span class="ea-opt">
              <span class="ea-opt__nom">{{ e.nombreCompleto }}</span>
              <span class="ea-opt__meta">
                DNI {{ e.dni ?? '—' }}{{ e.regimenLaboral ? ' · ' + e.regimenLaboral : '' }}
              </span>
            </span>
          </mat-option>
        }
        @if (opciones().length === 0) {
          <mat-option disabled class="ea-empty">Sin resultados. Revisa el nombre o el DNI.</mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: `
    :host {
      display: block;
    }
    .ea-field {
      width: 100%;
    }
    .ea-pref {
      color: var(--sisrh-text-soft, #94a3b8);
      margin-right: 0.25rem;
    }
    .ea-opt {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
      padding: 0.15rem 0;
    }
    .ea-opt__nom {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--sisrh-text, #1f2937);
    }
    .ea-opt__meta {
      font-size: 0.75rem;
      color: var(--sisrh-text-muted, #64748b);
      font-variant-numeric: tabular-nums;
    }
    .ea-empty {
      color: var(--sisrh-text-muted, #64748b);
      font-size: 0.8125rem;
      font-style: italic;
    }
  `,
})
export class EmpleadoAutocompleteComponent {
  /** Lista completa de empleados a ofrecer. */
  readonly empleados = input<readonly PersonaEmpleado[]>([]);
  /** Etiqueta del campo. */
  readonly label = input('Empleado');
  readonly placeholder = input('Buscar por nombre o DNI…');
  /** Id seleccionado (para precargar en edición). */
  readonly selectedId = input<number | null>(null);
  /** Empleado a excluir del listado (p. ej. el propio empleado, no puede ser su jefe). */
  readonly excluirId = input<number | null>(null);
  /** Emite el empleadoId elegido, o null al limpiar. */
  readonly selectedIdChange = output<number | null>();

  /** Texto tecleado o empleado elegido. */
  readonly busqueda = signal<string | PersonaEmpleado>('');

  constructor() {
    // Precarga/sincroniza el display cuando el id llega desde el padre (edición).
    effect(() => {
      const id = this.selectedId();
      const lista = this.empleados();
      untracked(() => {
        const actual = this.busqueda();
        const actualId =
          actual && typeof actual === 'object' ? (actual.empleadoId ?? null) : null;
        if (id == null) {
          if (actualId !== null) this.busqueda.set('');
          return;
        }
        if (actualId === id) return;
        const emp = lista.find((e) => e.empleadoId === id);
        if (emp) this.busqueda.set(emp);
      });
    });
  }

  readonly opciones = computed<readonly PersonaEmpleado[]>(() => {
    const excl = this.excluirId();
    const base = this.empleados().filter((e) => e.empleadoId != null && e.empleadoId !== excl);
    const v = this.busqueda();
    const q = this.normalizar(typeof v === 'string' ? v : '');
    if (!q) return base;
    return base.filter(
      (e) =>
        this.normalizar(e.nombreCompleto).includes(q) || this.normalizar(e.dni ?? '').includes(q),
    );
  });

  readonly displayEmpleado = (value: string | PersonaEmpleado | null): string => {
    if (!value || typeof value === 'string') return value ?? '';
    return `${value.nombreCompleto} — DNI ${value.dni ?? '—'}`;
  };

  onSeleccion(emp: PersonaEmpleado): void {
    this.busqueda.set(emp);
    this.selectedIdChange.emit(emp.empleadoId ?? null);
  }

  limpiar(): void {
    this.busqueda.set('');
    this.selectedIdChange.emit(null);
  }

  haySeleccion(): boolean {
    const v = this.busqueda();
    return !!v && typeof v === 'object';
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }
}
