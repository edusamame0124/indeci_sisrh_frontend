import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeletrabajoDetallePage } from './teletrabajo-detalle-page';

describe('TeletrabajoDetallePage', () => {
  let component: TeletrabajoDetallePage;
  let fixture: ComponentFixture<TeletrabajoDetallePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeletrabajoDetallePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeletrabajoDetallePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
