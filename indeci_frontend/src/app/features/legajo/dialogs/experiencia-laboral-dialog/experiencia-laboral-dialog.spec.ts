import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExperienciaLaboralDialog } from './experiencia-laboral-dialog';

describe('ExperienciaLaboralDialog', () => {
  let component: ExperienciaLaboralDialog;
  let fixture: ComponentFixture<ExperienciaLaboralDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperienciaLaboralDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExperienciaLaboralDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
