import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { HistorialLotesComponent } from './historial-lotes.component';
import type { PlanillaLoteDashboardRow } from '../../models/planilla-lote.model';

function loteFake(over: Partial<PlanillaLoteDashboardRow> = {}): PlanillaLoteDashboardRow {
  return {
    id: 1,
    periodo: '2026-07',
    regimenLaboralCodigo: '276',
    tipoPlanilla: 'ORDINARIA',
    correlativo: 1,
    estado: 'GENERADO',
    creadoEn: '2026-07-07T10:00:00',
    cantidadEmpleados: 12,
    montoTotalNeto: 34567.89,
    descripcionConcatenada: 'Planilla Ordinaria - 276',
    ...over,
  };
}

describe('HistorialLotesComponent', () => {
  function build(lotes: readonly PlanillaLoteDashboardRow[], cargando = false) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HistorialLotesComponent],
      providers: [provideRouter([]), provideNoopAnimations()],
    });
    const fixture = TestBed.createComponent(HistorialLotesComponent);
    fixture.componentRef.setInput('lotes', lotes);
    fixture.componentRef.setInput('cargando', cargando);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('sin lotes → muestra el estado vacío y no la tabla', () => {
    const fixture = build([]);
    const el: HTMLElement = fixture.nativeElement;
    expect(fixture.componentInstance.sinDatos()).toBe(true);
    expect(el.querySelector('.hist-empty')).not.toBeNull();
    expect(el.querySelector('table')).toBeNull();
  });

  it('con lotes → renderiza una fila por lote con el neto y trabajadores reales', () => {
    const fixture = build([loteFake(), loteFake({ id: 2, estado: 'ABIERTO' })]);
    const el: HTMLElement = fixture.nativeElement;
    expect(fixture.componentInstance.sinDatos()).toBe(false);
    const filas = el.querySelectorAll('tr[mat-row]');
    expect(filas.length).toBe(2);
    // El neto y el conteo deben provenir de los campos reales del DTO.
    expect(el.textContent).toContain('12');
    expect(el.textContent).toContain('34,567.89');
  });

  it('cargando=true → muestra la barra de progreso', () => {
    const fixture = build([], true);
    expect(fixture.nativeElement.querySelector('mat-progress-bar')).not.toBeNull();
  });

  it('badgeClase mapea estados a clases con color + texto', () => {
    const comp = build([]).componentInstance;
    expect(comp.badgeClase('GENERADO')).toContain('badge-success');
    expect(comp.badgeClase('ABIERTO')).toContain('badge-info');
    expect(comp.badgeClase('ANULADO')).toContain('badge-danger');
    expect(comp.badgeClase('PENDIENTE')).toContain('badge-warning');
    expect(comp.badgeClase('OTRO')).toBe('badge');
  });
});
