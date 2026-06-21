import { TestBed } from '@angular/core/testing';
import { AsistenciaTabService } from './asistencia-tab.service';

describe('AsistenciaTabService', () => {
  let service: AsistenciaTabService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AsistenciaTabService);
  });

  it('irAConsultaDiaria abre pestaña 2 con preselección', () => {
    service.irAConsultaDiaria('2026-06-18', '43872244');

    expect(service.selectedTab()).toBe(2);
    expect(service.preselectFecha()).toBe('2026-06-18');
    expect(service.preselectDni()).toBe('43872244');
  });

  it('irACargaIndividual abre pestaña 3', () => {
    service.irACargaIndividual('2026-06', 7);

    expect(service.selectedTab()).toBe(3);
    expect(service.preselectPeriodo()).toBe('2026-06');
    expect(service.preselectEmpleadoId()).toBe(7);
  });

  it('irAHistorial abre pestaña 4', () => {
    service.irAHistorial();
    expect(service.selectedTab()).toBe(4);
  });
});
