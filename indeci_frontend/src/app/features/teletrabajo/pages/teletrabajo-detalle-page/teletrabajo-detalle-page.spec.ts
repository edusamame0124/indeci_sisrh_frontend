import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { TeletrabajoDetallePage } from './teletrabajo-detalle-page';

describe('TeletrabajoDetallePage', () => {
  let component: TeletrabajoDetallePage;
  let fixture: ComponentFixture<TeletrabajoDetallePage>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TeletrabajoDetallePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideRouter([]),
      ],
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
