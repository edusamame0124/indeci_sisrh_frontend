import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, type MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { EssaludApiService } from '../../../../../../services/essalud-api.service';
import { PersonaApiService } from '../../../../../../../empleados/services/persona-api.service';
import { EmpleadoSaludEpsApiService } from '../../../../../../../empleados/services/empleado-salud-eps-api.service';
import type { PersonaResumen } from '../../../../../../../empleados/models/persona-empleado.model';
import type { EssaludResolverResult } from '../../../../../../models/essalud.model';
import type { EmpleadoSaludEpsRow } from '../../../../../../../empleados/models/empleado-salud-eps.model';

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
  selector: 'app-resolver-essalud',
  standalone: true,
  imports: [
    DecimalPipe, SlicePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resolver-essalud.component.html',
  styleUrl: './resolver-essalud.component.css',
})
export class ResolverEssaludComponent implements OnInit {
  private readonly api           = inject(EssaludApiService);
  private readonly personaApi    = inject(PersonaApiService);
  private readonly saludEpsApi   = inject(EmpleadoSaludEpsApiService);

  readonly empleadoSearchCtrl = new FormControl<string | PersonaResumen>('');

  readonly personas             = signal<readonly PersonaResumen[]>([]);
  readonly loadingPersonas      = signal(false);
  readonly empleadoSeleccionado = signal<PersonaResumen | null>(null);
  readonly searchQuery          = signal('');
  readonly periodo              = signal<string | null>(null);
  readonly resolving            = signal(false);
  readonly resultado            = signal<EssaludResolverResult | null>(null);
  readonly resolveError         = signal<string | null>(null);
  /** undefined = sin buscar aún | null = no hay registro | row = cobertura detectada */
  readonly coberturaDetectada   = signal<EmpleadoSaludEpsRow | null | undefined>(undefined);

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
    !this.resolving(),
  );

  constructor() {
    this.empleadoSearchCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.searchQuery.set(value);
          if (this.empleadoSeleccionado() !== null) {
            this.empleadoSeleccionado.set(null);
            this.resultado.set(null);
            this.resolveError.set(null);
            this.coberturaDetectada.set(undefined);
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
      this.coberturaDetectada.set(undefined);
    }
  }

  resolver(): void {
    if (!this.canResolve()) return;
    const emp     = this.empleadoSeleccionado()!;
    const periodo = this.periodo()!;

    this.resolving.set(true);
    this.resolveError.set(null);
    this.resultado.set(null);
    this.coberturaDetectada.set(undefined);

    // Paso 1: detectar cobertura de salud del trabajador para el período.
    // Usa emp.id (persona ID) porque la tabla INDECI_EMPLEADO_SALUD_EPS usa el PERSONA ID
    // como clave — igual que hace el diálogo EmpleadoSaludEpsDialog (row.id, no row.empleadoId).
    this.saludEpsApi.historial(emp.id).subscribe({
      next: (rows) => {
        const { tieneEps, cobertura } = this.detectarCoberturaPeriodo(rows, periodo);
        this.coberturaDetectada.set(cobertura);

        // Paso 2: resolver EsSalud usando la cobertura detectada
        this.api.resolver(emp.empleadoId!, periodo, tieneEps).subscribe({
          next: (r) => {
            this.resultado.set(r);
            this.resolving.set(false);
          },
          error: (err: any) => {
            this.resolveError.set(err?.error?.message ?? 'Error al resolver EsSalud.');
            this.resolving.set(false);
          },
        });
      },
      error: () => {
        // Sin registro de cobertura → asumir Solo EsSalud y continuar
        this.coberturaDetectada.set(null);
        this.api.resolver(emp.empleadoId!, periodo, false).subscribe({
          next: (r) => {
            this.resultado.set(r);
            this.resolving.set(false);
          },
          error: (err: any) => {
            this.resolveError.set(err?.error?.message ?? 'Error al resolver EsSalud.');
            this.resolving.set(false);
          },
        });
      },
    });
  }

  limpiar(): void {
    this.empleadoSearchCtrl.setValue('');
    this.empleadoSeleccionado.set(null);
    this.searchQuery.set('');
    this.periodo.set(null);
    this.resultado.set(null);
    this.resolveError.set(null);
    this.coberturaDetectada.set(undefined);
  }

  coberturaLabel(row: EmpleadoSaludEpsRow | null | undefined): string {
    if (row === undefined) return '';
    if (row === null)      return 'Sin registro de cobertura — se asume Solo EsSalud (9%)';
    if (row.tipoCobertura === 'ESSALUD_EPS') {
      return `EsSalud + EPS${row.epsNombre ? ' — ' + row.epsNombre : ''} (6.75% + 2.25%)`;
    }
    return 'Solo EsSalud (9%)';
  }

  coberturaIcon(row: EmpleadoSaludEpsRow | null | undefined): string {
    if (!row) return 'info_outline';
    return row.tipoCobertura === 'ESSALUD_EPS' ? 'health_and_safety' : 'medical_services';
  }

  coberturaClass(row: EmpleadoSaludEpsRow | null | undefined): string {
    if (row === null)                          return 'cobertura-chip--warn';
    if (row?.tipoCobertura === 'ESSALUD_EPS') return 'cobertura-chip--eps';
    return 'cobertura-chip--ok';
  }

  /** Encuentra la cobertura activa durante el período dado. */
  private detectarCoberturaPeriodo(
    rows: readonly EmpleadoSaludEpsRow[],
    periodo: string,
  ): { tieneEps: boolean; cobertura: EmpleadoSaludEpsRow | null } {
    const year  = parseInt(periodo.slice(0, 4), 10);
    const month = parseInt(periodo.slice(4, 6), 10);
    const primerDia  = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay    = new Date(year, month, 0).getDate();
    const ultimoDia  = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const activa = rows.find((r) =>
      r.estado !== 'ANULADO' &&
      r.fechaInicio <= ultimoDia &&
      (r.fechaFin === null || r.fechaFin >= primerDia),
    ) ?? null;

    return { tieneEps: activa?.tipoCobertura === 'ESSALUD_EPS', cobertura: activa };
  }
}
