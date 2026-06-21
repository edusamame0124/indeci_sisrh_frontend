import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, type MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Ir4taConfigApiService } from '../../../../../../services/ir4ta-config-api.service';
import { PersonaApiService } from '../../../../../../../empleados/services/persona-api.service';
import type { PersonaResumen } from '../../../../../../../empleados/models/persona-empleado.model';
import type { Ir4taResolverResult } from '../../../../../../models/ir4ta-config.model';

function generarPeriodos(): string[] {
  const periodos: string[] = [];
  const anioFin = new Date().getFullYear() + 2;
  for (let a = anioFin; a >= 2020; a--) {
    for (let m = 12; m >= 1; m--) {
      periodos.push(`${a}${String(m).padStart(2, '0')}`);
    }
  }
  return periodos;
}

function formatPeriodo(p: string): string {
  return `${p.slice(0, 4)}-${p.slice(4, 6)}`;
}

export interface SimulacionIr4ta {
  baseImponible: number;
  baseInafecta: number;
  tasaPct: number;
  afecto: boolean;
  /** Con retención aplicada (tasa sobre base) */
  conRetencion: number;
  /** Sin retención — suspensión 4ta vigente u operación exonerada */
  sinRetencion: number;
  neto: number;
}

@Component({
  selector: 'app-resolver-ir4ta',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resolver-ir4ta.component.html',
  styleUrl: './resolver-ir4ta.component.css',
})
export class ResolverIr4taComponent implements OnInit {
  private readonly api       = inject(Ir4taConfigApiService);
  private readonly personaApi = inject(PersonaApiService);

  readonly empleadoSearchCtrl = new FormControl<string | PersonaResumen>('');
  readonly baseCtrl  = new FormControl<number | null>(null, [Validators.min(0)]);
  private readonly baseValue = toSignal(this.baseCtrl.valueChanges, { initialValue: null as number | null });

  readonly personas             = signal<readonly PersonaResumen[]>([]);
  readonly loadingPersonas      = signal(false);
  readonly empleadoSeleccionado = signal<PersonaResumen | null>(null);
  readonly searchQuery          = signal('');
  readonly periodo              = signal<string | null>(null);
  readonly resolving            = signal(false);
  readonly resultado            = signal<Ir4taResolverResult | null>(null);
  readonly simulacion           = signal<SimulacionIr4ta | null>(null);
  readonly resolveError         = signal<string | null>(null);

  readonly periodos    = generarPeriodos();
  readonly formatLabel = formatPeriodo;

  readonly personasFiltradas = computed(() => {
    const q     = this.searchQuery().trim().toLowerCase();
    const todas = this.personas().filter((p) => p.empleadoId != null && p.empleadoId > 0);
    if (!q) return todas.slice(0, 20);
    return todas
      .filter((p) => {
        const blob = `${p.nombreCompleto} ${p.dni ?? ''} ${p.codigoInterno ?? ''}`.toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 20);
  });

  readonly canResolve = computed(() =>
    this.empleadoSeleccionado() !== null &&
    this.periodo() !== null &&
    !this.resolving() &&
    (this.baseValue() ?? 0) > 0,
  );

  constructor() {
    this.empleadoSearchCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.searchQuery.set(value);
          if (this.empleadoSeleccionado() !== null) {
            this.empleadoSeleccionado.set(null);
            this.limpiarResultado();
          }
        }
      });
  }

  ngOnInit(): void {
    this.loadingPersonas.set(true);
    this.personaApi.listar().subscribe({
      next: (list) => { this.personas.set(list); this.loadingPersonas.set(false); },
      error: ()    => { this.loadingPersonas.set(false); },
    });
  }

  displayPersona(p: PersonaResumen | string | null): string {
    if (!p || typeof p === 'string') return '';
    return `${p.nombreCompleto}${p.dni ? ' — DNI ' + p.dni : ''}`;
  }

  onEmpleadoSelected(ev: MatAutocompleteSelectedEvent): void {
    const persona = ev.option.value as PersonaResumen;
    if (persona?.empleadoId != null && persona.empleadoId > 0) {
      this.empleadoSeleccionado.set(persona);
      this.limpiarResultado();
    }
  }

  resolver(): void {
    if (!this.canResolve()) return;
    const periodo      = this.periodo()!;
    const baseImponible = this.baseCtrl.value ?? 0;

    this.resolving.set(true);
    this.resolveError.set(null);
    this.resultado.set(null);
    this.simulacion.set(null);

    this.api.resolver(periodo).subscribe({
      next: (r) => {
        this.resultado.set(r);
        if (r.encontrado && r.baseInafectaIr4ta != null && r.tasaIr4ta != null) {
          const baseInafecta = r.baseInafectaIr4ta;
          const tasaPct      = r.tasaIr4ta;
          const afecto       = baseImponible > baseInafecta;
          const conRetencion = afecto
            ? Math.round(baseImponible * tasaPct) / 100
            : 0;
          this.simulacion.set({
            baseImponible,
            baseInafecta,
            tasaPct,
            afecto,
            conRetencion,
            sinRetencion: 0,
            neto: baseImponible - conRetencion,
          });
        }
        this.resolving.set(false);
      },
      error: (err: { error?: { message?: string } }) => {
        this.resolveError.set(err?.error?.message ?? 'Error al consultar la vigencia IR4ta.');
        this.resolving.set(false);
      },
    });
  }

  limpiar(): void {
    this.empleadoSearchCtrl.setValue('');
    this.empleadoSeleccionado.set(null);
    this.searchQuery.set('');
    this.periodo.set(null);
    this.baseCtrl.setValue(null);
    this.limpiarResultado();
  }

  private limpiarResultado(): void {
    this.resultado.set(null);
    this.simulacion.set(null);
    this.resolveError.set(null);
  }
}
