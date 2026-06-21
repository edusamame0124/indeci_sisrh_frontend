import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeletrabajoActividadDialog } from './teletrabajo-actividad-dialog';

describe('TeletrabajoActividadDialog', () => {
  let component: TeletrabajoActividadDialog;
  let fixture: ComponentFixture<TeletrabajoActividadDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeletrabajoActividadDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeletrabajoActividadDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
