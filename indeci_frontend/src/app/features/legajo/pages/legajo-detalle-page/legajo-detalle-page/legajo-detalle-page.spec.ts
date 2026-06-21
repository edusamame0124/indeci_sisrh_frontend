import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegajoDetallePage } from './legajo-detalle-page';

describe('LegajoDetallePage', () => {
  let component: LegajoDetallePage;
  let fixture: ComponentFixture<LegajoDetallePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegajoDetallePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LegajoDetallePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
