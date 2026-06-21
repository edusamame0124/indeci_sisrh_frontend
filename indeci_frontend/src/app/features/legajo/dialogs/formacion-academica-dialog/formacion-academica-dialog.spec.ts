import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormacionAcademicaDialog } from './formacion-academica-dialog';

describe('FormacionAcademicaDialog', () => {
  let component: FormacionAcademicaDialog;
  let fixture: ComponentFixture<FormacionAcademicaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormacionAcademicaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormacionAcademicaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
