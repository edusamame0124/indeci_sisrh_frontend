import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AprobarRrhhPapeletaDialogComponent } from './aprobar-rrhh-papeleta-dialog';

describe('AprobarRrhhPapeletaDialog', () => {
  let component: AprobarRrhhPapeletaDialogComponent;
  let fixture: ComponentFixture<AprobarRrhhPapeletaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AprobarRrhhPapeletaDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AprobarRrhhPapeletaDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
