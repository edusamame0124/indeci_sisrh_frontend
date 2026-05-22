import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { EmpleadoFlowBackendSyncService } from './empleado-flow-backend-sync.service';
import { EmpleadoFlowService } from './empleado-flow.service';
import { EmpleadoFlowStatusApiService } from './empleado-flow-status-api.service';
import type { EmpleadoFlowStatus } from '../models/empleado-flow-status.model';

describe('EmpleadoFlowBackendSyncService (Spec 012 / C3 — BKD-006)', () => {
  let svc: EmpleadoFlowBackendSyncService;
  let flow: EmpleadoFlowService;

  function configure(api: Partial<EmpleadoFlowStatusApiService>): void {
    TestBed.configureTestingModule({
      providers: [
        EmpleadoFlowBackendSyncService,
        EmpleadoFlowService,
        { provide: EmpleadoFlowStatusApiService, useValue: api },
      ],
    });
    svc = TestBed.inject(EmpleadoFlowBackendSyncService);
    flow = TestBed.inject(EmpleadoFlowService);
  }

  const status = (over: Partial<EmpleadoFlowStatus>): EmpleadoFlowStatus => ({
    empleadoId: 42,
    puesto: false,
    banco: false,
    pension: false,
    planilla: false,
    conceptos: false,
    ...over,
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('marca los pasos según el estado agregado del backend', async () => {
    configure({
      flowStatus: () => of(status({ puesto: true, planilla: true })),
    });
    await firstValueFrom(svc.syncCompletedStepsFromBackend(42));
    const steps = flow.completedSteps(42)();
    expect(steps[1]).toBe(true); // puesto
    expect(steps[2]).toBe(false); // banco
    expect(steps[3]).toBe(false); // pensión
    expect(steps[4]).toBe(true); // planilla
    expect(steps[5]).toBe(false); // conceptos
  });

  it('tolera un fallo HTTP sin propagar el error', async () => {
    configure({
      flowStatus: () => throwError(() => new Error('net')),
    });
    await firstValueFrom(svc.syncCompletedStepsFromBackend(42));
    const steps = flow.completedSteps(42)();
    expect(steps[1]).toBe(false);
  });

  it('no op con empleadoId inválido', async () => {
    configure({
      flowStatus: () => {
        throw new Error('no debe llamarse');
      },
    });
    await firstValueFrom(svc.syncCompletedStepsFromBackend(0));
  });
});
