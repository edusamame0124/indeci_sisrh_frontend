import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ValidacionPreflightApiService } from '../../services/validacion-preflight-api.service';
import type {
  PreflightValidacionResponse,
  ValidacionHallazgoRow,
  ValidacionSeveridad,
} from '../../models/validacion-hallazgo.model';

/**
 * F3.3 — Centro de Validaciones (preflight de planilla).
 *
 * <p>Panel solo lectura. El usuario selecciona un período, dispara el
 * preflight contra el backend y obtiene una lista categorizada por severidad
 * (BLOQUEO / ALERTA / INFO). Sin paginación: el universo típico es &lt;200
 * hallazgos.</p>
 *
 * <p>Ruta: {@code /planilla/validaciones}.</p>
 */
@Component({
  selector: 'app-validaciones-centro-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './validaciones-centro-page.component.html',
  styleUrl: './validaciones-centro-page.component.css',
})
export class ValidacionesCentroPageComponent {
  private readonly api = inject(ValidacionPreflightApiService);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorMessageService);

  /** Período actual sugerido (YYYY-MM del mes corriente). */
  private static periodoActual(): string {
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = (ahora.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
  }

  // ===================== State =====================

  readonly periodoCtrl = new FormControl<string>(
    ValidacionesCentroPageComponent.periodoActual(),
    { nonNullable: true },
  );

  readonly loading = signal(false);
  readonly result = signal<PreflightValidacionResponse | null>(null);
  readonly errorMsg = signal<string | null>(null);

  /** Filtros de UI. */
  readonly severidadActiva = signal<readonly ValidacionSeveridad[]>([
    'BLOQUEO',
    'ALERTA',
    'INFO',
  ]);
  readonly filtroModulo = signal<string>('TODOS');
  readonly buscador = signal<string>('');

  // ===================== Computed =====================

  readonly totalBloqueos = computed(() => this.result()?.totalBloqueos ?? 0);
  readonly totalAlertas = computed(() => this.result()?.totalAlertas ?? 0);
  readonly totalInfo = computed(() => this.result()?.totalInfo ?? 0);

  readonly modulosUnicos = computed<readonly string[]>(() => {
    const set = new Set<string>();
    for (const h of this.result()?.hallazgos ?? []) set.add(h.modulo);
    return ['TODOS', ...Array.from(set).sort()];
  });

  readonly hallazgosFiltrados = computed<readonly ValidacionHallazgoRow[]>(() => {
    const r = this.result();
    if (!r) return [];

    const sev = new Set(this.severidadActiva());
    const mod = this.filtroModulo();
    const q = this.buscador().trim().toLowerCase();

    return r.hallazgos.filter((h) => {
      if (!sev.has(h.severidad)) return false;
      if (mod !== 'TODOS' && h.modulo !== mod) return false;
      if (q) {
        const hay =
          h.mensaje.toLowerCase().includes(q) ||
          (h.empleadoNombre ?? '').toLowerCase().includes(q) ||
          h.codigo.toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  });

  readonly columnas = ['severidad', 'codigo', 'modulo', 'mensaje', 'empleado', 'accion'];

  // ===================== Acciones =====================

  evaluar(): void {
    const periodo = (this.periodoCtrl.value ?? '').trim();
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      this.errorMsg.set('Selecciona un período válido (YYYY-MM).');
      return;
    }
    this.errorMsg.set(null);
    this.loading.set(true);
    this.api.preflight(periodo).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.result.set(null);
        const body = err.error;
        const msg = isErrorResponse(body)
          ? this.errors.translate(body.mensaje)
          : this.errors.translate(null);
        this.errorMsg.set(msg);
      },
    });
  }

  toggleSeveridad(s: ValidacionSeveridad): void {
    const set = new Set(this.severidadActiva());
    if (set.has(s)) set.delete(s);
    else set.add(s);
    this.severidadActiva.set(Array.from(set) as readonly ValidacionSeveridad[]);
  }

  isSeveridadActiva(s: ValidacionSeveridad): boolean {
    return this.severidadActiva().includes(s);
  }

  setModulo(m: string): void {
    this.filtroModulo.set(m);
  }

  limpiarFiltros(): void {
    this.severidadActiva.set(['BLOQUEO', 'ALERTA', 'INFO']);
    this.filtroModulo.set('TODOS');
    this.buscador.set('');
  }

  // ===================== Navegación =====================

  /** Empleado → Ficha 360 si hay {@code empleadoId}. */
  irAEmpleado(h: ValidacionHallazgoRow): void {
    if (h.empleadoId == null) return;
    const periodo = this.result()?.periodo ?? this.periodoCtrl.value ?? '';
    this.router.navigate(['/empleados/ficha', h.empleadoId, periodo]);
  }

  /** CTA del empty state cuando 0 bloqueos: ir a Generación masiva. */
  irAGeneracion(): void {
    this.router.navigate(['/planilla/generacion-masiva']);
  }

  // ===================== Presentación =====================

  iconoSeveridad(s: ValidacionSeveridad): string {
    switch (s) {
      case 'BLOQUEO': return 'error';
      case 'ALERTA':  return 'warning';
      case 'INFO':    return 'info';
    }
  }

  labelSeveridad(s: ValidacionSeveridad): string {
    switch (s) {
      case 'BLOQUEO': return 'Bloqueo';
      case 'ALERTA':  return 'Alerta';
      case 'INFO':    return 'Información';
    }
  }
}
