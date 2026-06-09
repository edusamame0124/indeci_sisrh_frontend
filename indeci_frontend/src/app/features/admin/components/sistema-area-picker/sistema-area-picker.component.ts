import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs';
import {
  MatAutocompleteModule,
  type MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import type { SistemaArea } from '../../models/admin.models';

/**
 * Selector de area/oficina con autocomplete y busqueda, reutilizable por la
 * consola de accesos (Convocatoria = «Area», Rendimiento/GDR = «Oficina»).
 *
 * Patron UI alineado a persona-picker: input con `mat-autocomplete`, filtrado
 * por sigla/codigo/nombre, top 50 resultados y boton para limpiar la seleccion.
 * Emite el `codigo` del area elegido (cadena vacia = sin seleccion).
 */
@Component({
  selector: 'app-sistema-area-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" class="full">
      <mat-label>{{ label() }}{{ required() ? ' *' : '' }}</mat-label>
      <input
        matInput
        [formControl]="query"
        [matAutocomplete]="auto"
        [attr.aria-label]="'Buscar ' + label().toLowerCase()"
        placeholder="Buscar por sigla o nombre"
        autocomplete="off"
      />
      <mat-autocomplete
        #auto="matAutocomplete"
        [displayWith]="display"
        (optionSelected)="onSelected($event)"
      >
        @for (a of opciones(); track a.codigo) {
          <mat-option [value]="a">
            <span class="sa-sigla">{{ a.sigla ?? a.codigo }}</span>
            <span class="sa-nombre">{{ a.nombre }}</span>
          </mat-option>
        } @empty {
          <mat-option disabled>Sin coincidencias</mat-option>
        }
      </mat-autocomplete>
      @if (mostrarLimpiar()) {
        <button
          mat-icon-button
          matSuffix
          type="button"
          (click)="limpiar()"
          [attr.aria-label]="'Quitar ' + label().toLowerCase()"
        >
          <mat-icon fontIcon="close" />
        </button>
      }
    </mat-form-field>
  `,
  styles: [
    `
      .full {
        width: 100%;
      }
      .sa-sigla {
        font-weight: 600;
        margin-right: 0.5rem;
        font-variant-numeric: tabular-nums;
      }
      .sa-nombre {
        color: var(--sisrh-text-muted, #5f6368);
      }
    `,
  ],
})
export class SistemaAreaPickerComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly areas = input<readonly SistemaArea[]>([]);
  readonly selected = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly label = input<string>('Oficina');
  readonly required = input<boolean>(true);

  @Output() readonly areaChange = new EventEmitter<string>();

  readonly query = new FormControl<SistemaArea | string>('', { nonNullable: true });

  private readonly queryValue = toSignal(
    this.query.valueChanges.pipe(startWith(this.query.value)),
    { initialValue: '' as SistemaArea | string },
  );

  readonly opciones = computed<readonly SistemaArea[]>(() => {
    const ordenadas = [...this.areas()].sort(
      (a, b) =>
        (a.orden ?? 0) - (b.orden ?? 0) ||
        a.nombre.localeCompare(b.nombre, 'es-PE'),
    );
    const v = this.queryValue();
    if (!v || typeof v !== 'string') {
      return ordenadas.slice(0, 50);
    }
    const q = v.trim().toLowerCase();
    if (!q) {
      return ordenadas.slice(0, 50);
    }
    return ordenadas
      .filter((a) =>
        `${a.sigla ?? ''} ${a.codigo} ${a.nombre}`.toLowerCase().includes(q),
      )
      .slice(0, 50);
  });

  readonly mostrarLimpiar = computed(
    () => !this.disabled() && this.selected() !== '',
  );

  constructor() {
    effect(() => {
      if (this.disabled()) {
        this.query.disable({ emitEvent: false });
      } else {
        this.query.enable({ emitEvent: false });
      }
    });

    effect(() => {
      const code = this.selected();
      const match = this.areas().find((a) => a.codigo === code) ?? null;
      const current = this.query.value;
      const currentCode =
        current && typeof current !== 'string' ? current.codigo : '';
      if (code !== currentCode) {
        this.query.setValue(match ?? '', { emitEvent: false });
      }
    });

    this.query.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        if (typeof v === 'string' && v.trim() === '' && this.selected() !== '') {
          this.areaChange.emit('');
        }
      });
  }

  display = (v: SistemaArea | string): string =>
    v && typeof v !== 'string' ? `${v.sigla ?? v.codigo} — ${v.nombre}` : '';

  onSelected(event: MatAutocompleteSelectedEvent): void {
    const area = event.option.value as SistemaArea;
    this.areaChange.emit(area.codigo);
  }

  limpiar(): void {
    this.query.setValue('', { emitEvent: false });
    this.areaChange.emit('');
  }
}
