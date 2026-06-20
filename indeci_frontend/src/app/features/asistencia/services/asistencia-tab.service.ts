import { Injectable, signal } from '@angular/core';

/**
 * Controla la pestaña activa del shell de Carga de asistencia para permitir
 * navegación cruzada entre pestañas (p. ej., "Ver asistencia" desde la carga masiva).
 * Orden de pestañas: 0 = Jornada y tolerancias · 1 = Carga masiva CSV ·
 * 2 = Consulta diaria de asistencia · 3 = Asistencia por empleado · 4 = Historial.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaTabService {
  readonly selectedTab = signal(0);

  /** Contexto a preseleccionar en "Asistencia por empleado" al navegar desde otra pestaña. */
  readonly preselectPeriodo = signal<string | null>(null);
  readonly preselectEmpleadoId = signal<number | null>(null);

  /** Contexto a preseleccionar en "Consulta diaria de asistencia". */
  readonly preselectFecha = signal<string | null>(null);
  readonly preselectDni = signal<string | null>(null);

  /** Abre "Consulta diaria de asistencia" preseleccionando fecha (y DNI, si aplica). */
  irAConsultaDiaria(fecha?: string | null, dni?: string | null): void {
    this.preselectFecha.set(fecha ?? null);
    this.preselectDni.set(dni ?? null);
    this.selectedTab.set(2);
  }

  /** Abre "Asistencia por empleado" preseleccionando periodo (y empleado, si aplica). */
  irACargaIndividual(periodo?: string | null, empleadoId?: number | null): void {
    this.preselectPeriodo.set(periodo ?? null);
    this.preselectEmpleadoId.set(empleadoId ?? null);
    this.selectedTab.set(3);
  }

  irAHistorial(): void {
    this.selectedTab.set(4);
  }
}
