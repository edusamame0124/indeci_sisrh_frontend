import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MisAsistenciasPage } from './mis-asistencias-page';

describe('MisAsistenciasPage', () => {
  let component: MisAsistenciasPage;
  let fixture: ComponentFixture<MisAsistenciasPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisAsistenciasPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MisAsistenciasPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
