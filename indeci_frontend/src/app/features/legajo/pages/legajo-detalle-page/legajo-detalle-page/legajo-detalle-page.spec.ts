import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { LegajoDetallePage } from './legajo-detalle-page';

describe('LegajoDetallePage', () => {
  let component: LegajoDetallePage;
  let fixture: ComponentFixture<LegajoDetallePage>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LegajoDetallePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideRouter([]),
      ],
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
