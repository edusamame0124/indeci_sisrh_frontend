import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, CurrencyPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule, type MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ParametroPrevisionalApiService } from '../../../../../../services/parametro-previsional-api.service';
import { PersonaApiService } from '../../../../../../../empleados/services/persona-api.service';
import type { ResolverParametroResult } from '../../../../../../models/parametro-previsional.model';
import type { EstadoValidacionPrevisional } from '../../../../../../models/parametro-previsional.model';
import type { PersonaResumen } from '../../../../../../../empleados/models/persona-empleado.model';

function generarPeriodos(): string[] {
  const periodos: string[] = [];
  const anioFin = new Date().getFullYear() + 2;
  for (let a = anioFin; a >= 1990; a--) {
    for (let m = 12; m >= 1; m--) {
      periodos.push(`${a}${String(m).padStart(2, '0')}`);
    }
  }
  return periodos;
}

function formatPeriodo(p: string): string {
  return `${p.slice(0, 4)}-${p.slice(4, 6)}`;
}

@Component({
  selector: 'app-resolver-parametro',
  standalone: true,
  imports: [
    DecimalPipe,
    CurrencyPipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resolver-parametro.component.html',
  styleUrl: './resolver-parametro.component.css',
})
export class ResolverParametroComponent implements OnInit {
  private readonly api       = inject(ParametroPrevisionalApiService);
  private readonly personaApi = inject(PersonaApiService);

  readonly empleadoSearchCtrl = new FormControl<string | PersonaResumen>('');

  readonly personas            = signal<readonly PersonaResumen[]>([]);
  readonly loadingPersonas     = signal(false);
  readonly empleadoSeleccionado = signal<PersonaResumen | null>(null);
  readonly searchQuery          = signal('');

  readonly periodo = signal<string | null>(null);

  readonly resolving = signal(false);
  readonly error     = signal<string | null>(null);
  readonly resultado = signal<ResolverParametroResult | null>(null);

  readonly periodos    = generarPeriodos();
  readonly formatLabel = formatPeriodo;

  readonly personasFiltradas = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const todas = this.personas().filter(
      (p) => p.empleadoId != null && p.empleadoId > 0,
    );
    if (!q) return todas.slice(0, 20);
    return todas
      .filter((p) => {
        const blob = `${p.nombreCompleto} ${p.dni ?? ''} ${p.codigoInterno ?? ''}`.toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 20);
  });

  constructor() {
    this.empleadoSearchCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.searchQuery.set(value);
          if (this.empleadoSeleccionado() !== null) {
            this.empleadoSeleccionado.set(null);
            this.resultado.set(null);
            this.error.set(null);
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
    }
  }

  canResolve(): boolean {
    return (
      this.empleadoSeleccionado() !== null &&
      this.periodo() !== null &&
      !this.resolving()
    );
  }

  resolver(): void {
    if (!this.canResolve()) return;
    const emp = this.empleadoSeleccionado()!;
    const per = this.periodo()!;
    this.resolving.set(true);
    this.error.set(null);
    this.resultado.set(null);

    this.api.resolver(emp.empleadoId ?? null, per).subscribe({
      next:  (r) => { this.resultado.set(r); this.resolving.set(false); },
      error: ()  => {
        this.error.set('No se pudo resolver el parámetro. Verifique el empleado y el período seleccionados.');
        this.resolving.set(false);
      },
    });
  }

  limpiar(): void {
    this.empleadoSearchCtrl.setValue('');
    this.empleadoSeleccionado.set(null);
    this.searchQuery.set('');
    this.periodo.set(null);
    this.resultado.set(null);
    this.error.set(null);
  }

  estadoEs(r: ResolverParametroResult, estado: EstadoValidacionPrevisional): boolean {
    return r.estadoValidacion === estado;
  }

  esValido(r: ResolverParametroResult): boolean {
    return r.estadoValidacion === 'VALIDO';
  }

  formatPeriodoDisplay(periodo: string | null): string {
    if (!periodo || periodo.length !== 6) return periodo ?? '–';
    return `${periodo.slice(0, 4)}-${periodo.slice(4, 6)}`;
  }

  vigenciaDisplay(inicio: string | null, fin: string | null): string {
    const i = this.formatPeriodoDisplay(inicio);
    const f = fin ? this.formatPeriodoDisplay(fin) : 'vigente';
    return `${i} al ${f}`;
  }
}
