import { Injectable, inject } from '@angular/core';
import { type Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { EmpleadoFlowStatusApiService } from './empleado-flow-status-api.service';
import { EmpleadoFlowService } from './empleado-flow.service';

/** Alineado a {@link EMPLEADO_FLUJO_PASOS}: índices 1…5 (el 0 lo hidrata `hydrateFromPersona`). */
const PASO_PUESTO = 1;
const PASO_BANCO = 2;
const PASO_PENSION = 3;
const PASO_PLANILLA = 4;
const PASO_CONCEPTOS = 5;

function normalizeEmpleadoId(empleadoId: number): number | null {
  const n = Math.trunc(Number(empleadoId));
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

/**
 * Marca pasos del flujo RRHH según registros existentes en backend (Spec 009).
 * Evita banners de prerequisito falsos al refrescar o enlazar profundo sin navegar paso a paso.
 *
 * Spec 012 / C3 (BKD-006): un único endpoint agregado `flow-status` reemplaza
 * los 5 GET paralelos (puesto, banco, pensión, planilla, conceptos).
 */
@Injectable({ providedIn: 'root' })
export class EmpleadoFlowBackendSyncService {
  private readonly flow = inject(EmpleadoFlowService);
  private readonly flowStatusApi = inject(EmpleadoFlowStatusApiService);

  /**
   * Consulta el estado agregado del flujo y actualiza `EmpleadoFlowService`
   * (idempotente). Un fallo HTTP se ignora para no bloquear la pantalla.
   */
  syncCompletedStepsFromBackend(empleadoId: number): Observable<void> {
    const id = normalizeEmpleadoId(empleadoId);
    if (id == null) return of(undefined);

    return this.flowStatusApi.flowStatus(id).pipe(
      tap((status) => {
        if (status.puesto) this.flow.markCompleted(id, PASO_PUESTO);
        if (status.banco) this.flow.markCompleted(id, PASO_BANCO);
        if (status.pension) this.flow.markCompleted(id, PASO_PENSION);
        if (status.planilla) this.flow.markCompleted(id, PASO_PLANILLA);
        if (status.conceptos) this.flow.markCompleted(id, PASO_CONCEPTOS);
      }),
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }
}
