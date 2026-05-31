import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AprobarRrhhPapeletaDialog } from './aprobar-rrhh-papeleta-dialog';

describe('AprobarRrhhPapeletaDialog', () => {
  let component: AprobarRrhhPapeletaDialog;
  let fixture: ComponentFixture<AprobarRrhhPapeletaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AprobarRrhhPapeletaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AprobarRrhhPapeletaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
