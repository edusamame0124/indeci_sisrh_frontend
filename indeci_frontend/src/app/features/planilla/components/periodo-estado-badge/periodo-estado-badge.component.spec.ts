import { describe, expect, it, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PeriodoEstadoBadgeComponent } from './periodo-estado-badge.component';

describe('PeriodoEstadoBadgeComponent (Spec 009 / T152)', () => {
  function build(estado: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [PeriodoEstadoBadgeComponent] });
    const fixture = TestBed.createComponent(PeriodoEstadoBadgeComponent);
    fixture.componentRef.setInput('estado', estado);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('ABIERTO → clase verde + aria-label "Periodo abierto"', () => {
    const fixture = build('ABIERTO');
    const comp = fixture.componentInstance;
    expect(comp.normalized()).toBe('ABIERTO');
    expect(comp.label()).toBe('ABIERTO');
    expect(comp.className()).toContain('sisrh-badge--info');
    expect(comp.ariaLabel()).toBe('Periodo abierto');
  });

  it('CERRADO → clase roja + aria-label "Periodo cerrado"', () => {
    const fixture = build('CERRADO');
    const comp = fixture.componentInstance;
    expect(comp.normalized()).toBe('CERRADO');
    expect(comp.className()).toContain('sisrh-badge--neutral');
    expect(comp.ariaLabel()).toBe('Periodo cerrado');
  });

  it('EN_REVISION → clase ámbar + label "EN REVISIÓN" (Spec 011)', () => {
    const comp = build('EN_REVISION').componentInstance;
    expect(comp.normalized()).toBe('EN_REVISION');
    expect(comp.label()).toBe('EN REVISIÓN');
    expect(comp.className()).toContain('sisrh-badge--warning');
    expect(comp.ariaLabel()).toBe('Periodo en revisión');
  });

  it('APROBADO → clase verde + aria-label "Periodo aprobado" (Spec 011)', () => {
    const comp = build('APROBADO').componentInstance;
    expect(comp.normalized()).toBe('APROBADO');
    expect(comp.className()).toContain('sisrh-badge--success');
    expect(comp.ariaLabel()).toBe('Periodo aprobado');
  });

  it('normaliza mayúsculas / espacios / valor inválido', () => {
    expect(build(' abierto ').componentInstance.normalized()).toBe('ABIERTO');
    expect(build('   ').componentInstance.normalized()).toBe('DESCONOCIDO');
    expect(build('SUSPENDIDO').componentInstance.normalized()).toBe('DESCONOCIDO');
  });

  it('desconocido renderiza guion largo y clase gris', () => {
    const fixture = build('???');
    const comp = fixture.componentInstance;
    expect(comp.label()).toBe('—');
    expect(comp.className()).toContain('sisrh-badge--neutral');
  });
});
