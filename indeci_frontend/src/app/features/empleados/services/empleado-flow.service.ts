import { computed, Injectable, signal, type Signal, type WritableSignal } from '@angular/core';
import { EMPLEADO_FLUJO_PASOS } from '../components/empleado-stepper/empleado-stepper.component';
import type { PersonaEmpleado } from '../models/persona-empleado.model';

const STEP_COUNT = EMPLEADO_FLUJO_PASOS.length;
const PASO_DATOS_PERSONALES = 0;
const DNI_PE_PATTERN = /^\d{8}$/;

/**
 * Identidad mínima alineada al alta institucional: persona persistida + DNI Perú + nombre.
 * `distritoId` no es obligatorio para no bloquear migraciones incompletas.
 */
export function personaCumplePasoDatosPersonales(persona: PersonaEmpleado): boolean {
  const id = Number(persona.id);
  if (!Number.isFinite(id) || id < 1) return false;
  if (persona.empleadoId == null || Number(persona.empleadoId) < 1) return false;

  const nombre = typeof persona.nombreCompleto === 'string' ? persona.nombreCompleto.trim() : '';
  if (nombre === '') return false;

  const dni = typeof persona.dni === 'string' ? persona.dni.trim() : '';
  if (!DNI_PE_PATTERN.test(dni)) return false;

  return true;
}

function emptySteps(): readonly boolean[] {
  return Array.from({ length: STEP_COUNT }, () => false);
}

function normalizeEmpleadoId(empleadoId: number): number | null {
  const n = Math.trunc(Number(empleadoId));
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function normalizePaso(paso: number): number | null {
  const p = Math.trunc(Number(paso));
  if (!Number.isFinite(p) || p < 0 || p >= STEP_COUNT) return null;
  return p;
}

/**
 * Progreso del flujo de empleado (6 pasos) en memoria del cliente.
 * El paso 0 puede hidratarse desde persona; los pasos 1–5 desde backend vía
 * {@link EmpleadoFlowBackendSyncService}.
 */
@Injectable({ providedIn: 'root' })
export class EmpleadoFlowService {
  private readonly writables = new Map<number, WritableSignal<readonly boolean[]>>();
  private readonly completedSignals = new Map<number, Signal<readonly boolean[]>>();

  /**
   * Señal con longitud fija (índices 0…5), alineada a {@link EMPLEADO_FLUJO_PASOS}.
   * Referencia estable por `empleadoId` para usar en plantillas / computed.
   */
  completedSteps(empleadoId: number): Signal<readonly boolean[]> {
    const id = normalizeEmpleadoId(empleadoId);
    if (id == null) {
      return computed(() => emptySteps());
    }
    let ro = this.completedSignals.get(id);
    if (!ro) {
      const w = signal<readonly boolean[]>(emptySteps());
      this.writables.set(id, w);
      ro = computed(() => w());
      this.completedSignals.set(id, ro);
    }
    return ro;
  }

  /**
   * Marca paso «Datos personales» (0) si el detalle RRHH ya trae ficha suficiente.
   * Evita banners falsos positivos antes de persistir el progreso en backend.
   */
  hydrateFromPersona(persona: PersonaEmpleado): void {
    if (!personaCumplePasoDatosPersonales(persona)) return;
    const eid = Number(persona.empleadoId);
    this.markCompleted(eid, PASO_DATOS_PERSONALES);
  }

  /** Marca el paso como completado (idempotente). */
  markCompleted(empleadoId: number, paso: number): void {
    const id = normalizeEmpleadoId(empleadoId);
    const p = normalizePaso(paso);
    if (id == null || p == null) return;
    this.writableFor(id).update((prev) => {
      const next = [...prev];
      next[p] = true;
      return next;
    });
  }

  /**
   * Quita el estado en memoria del colaborador (p. ej. al cerrar flujo o en pruebas).
   */
  clearProgress(empleadoId: number): void {
    const id = normalizeEmpleadoId(empleadoId);
    if (id == null) return;
    this.writables.delete(id);
    this.completedSignals.delete(id);
  }

  private writableFor(id: number): WritableSignal<readonly boolean[]> {
    let w = this.writables.get(id);
    if (!w) {
      w = signal<readonly boolean[]>(emptySteps());
      this.writables.set(id, w);
      this.completedSignals.set(id, computed(() => w!()));
    }
    return w;
  }
}
