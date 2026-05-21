import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Estados del ciclo de vida del período (Spec 011 — B7). */
export type PeriodoEstado = 'ABIERTO' | 'EN_REVISION' | 'APROBADO' | 'CERRADO';

function normalizeEstado(value: unknown): PeriodoEstado | 'DESCONOCIDO' {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === 'ABIERTO' || raw === 'EN_REVISION' || raw === 'APROBADO' || raw === 'CERRADO') {
    return raw;
  }
  return 'DESCONOCIDO';
}

/**
 * Badge visual del estado de un periodo de planilla (Spec 009 / T152, Spec 011 / B7).
 * Ciclo de vida: ABIERTO → EN_REVISION → APROBADO → CERRADO.
 *  - verde ABIERTO · ámbar EN_REVISION · azul APROBADO · rojo CERRADO
 *  - gris para valores fuera del dominio (defensivo)
 */
@Component({
  selector: 'app-periodo-estado-badge',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './periodo-estado-badge.component.html',
  styleUrl: './periodo-estado-badge.component.css',
})
export class PeriodoEstadoBadgeComponent {
  readonly estado = input<string>('');

  readonly normalized = computed(() => normalizeEstado(this.estado()));

  readonly label = computed(() => {
    const n = this.normalized();
    if (n === 'DESCONOCIDO') return '—';
    if (n === 'EN_REVISION') return 'EN REVISIÓN';
    return n;
  });

  readonly className = computed(() => {
    const n = this.normalized();
    if (n === 'ABIERTO') return 'sisrh-badge sisrh-badge--info';
    if (n === 'EN_REVISION') return 'sisrh-badge sisrh-badge--warning';
    if (n === 'APROBADO') return 'sisrh-badge sisrh-badge--success';
    if (n === 'CERRADO') return 'sisrh-badge sisrh-badge--neutral';
    return 'sisrh-badge sisrh-badge--neutral';
  });

  readonly ariaLabel = computed(() => {
    const n = this.normalized();
    if (n === 'ABIERTO') return 'Periodo abierto';
    if (n === 'EN_REVISION') return 'Periodo en revisión';
    if (n === 'APROBADO') return 'Periodo aprobado';
    if (n === 'CERRADO') return 'Periodo cerrado';
    return 'Estado de periodo no reconocido';
  });
}
