import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../../../../core/services/auth.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { PersonaApiService } from '../../../../../empleados/services/persona-api.service';
import { SubsidioApiService } from '../../services/subsidio-api.service';
import { BandejaCasosComponent } from './bandeja-casos.component';

describe('BandejaCasosComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BandejaCasosComponent, NoopAnimationsModule],
      providers: [
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: ErrorMessageService, useValue: { translate: (m: string | null) => m ?? 'Error' } },
        {
          provide: AuthService,
          useValue: { permisos: () => ['SUB_READ', 'SUB_WRITE'] },
        },
        {
          provide: SubsidioApiService,
          useValue: {
            listarCasos: vi.fn(() =>
              of({
                content: [
                  {
                    id: 1,
                    empleadoId: 10,
                    codigoCaso: 'SUB-2026-001',
                    tipoCaso: 'ENFERMEDAD',
                    estado: 'BORRADOR',
                    fechaContingencia: '2026-05-01',
                    fechaInicio: '2026-05-02',
                    fechaFin: '2026-05-15',
                    diasContingencia: 14,
                    versionCaso: 1,
                    reglaVigenciaId: null,
                    modoCalculo: 'OFICIAL',
                    observacion: null,
                    nombreEmpleado: 'Juan Pérez',
                    dniEmpleado: '12345678',
                    createdAt: null,
                    citts: [],
                    tramos: [],
                  },
                ],
                totalElements: 1,
                totalPages: 1,
                page: 0,
                size: 20,
              }),
            ),
          },
        },
        {
          provide: PersonaApiService,
          useValue: {
            listarPaginado: vi.fn(() =>
              of({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 15 }),
            ),
          },
        },
      ],
    }).compileComponents();
  });

  it('carga bandeja de casos al iniciar', async () => {
    const fixture = TestBed.createComponent(BandejaCasosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const cmp = fixture.componentInstance;
    expect(cmp.casos().length).toBe(1);
    expect(cmp.casos()[0].codigoCaso).toBe('SUB-2026-001');
    expect(cmp.puedeCrear()).toBe(true);
  });

  it('emite verDetalle al seleccionar caso', async () => {
    const fixture = TestBed.createComponent(BandejaCasosComponent);
    const cmp = fixture.componentInstance;
    const spy = vi.fn();
    cmp.verDetalle.subscribe(spy);
    fixture.detectChanges();
    await fixture.whenStable();

    cmp.verCaso(cmp.casos()[0]);
    expect(spy).toHaveBeenCalledWith(1);
  });
});
