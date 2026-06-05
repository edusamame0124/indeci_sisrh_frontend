import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AprobarJefePapeletaDialogComponent } from './aprobar-jefe-papeleta-dialog';

describe('AprobarJefePapeletaDialog', () => {
  let component: AprobarJefePapeletaDialogComponent;
  let fixture: ComponentFixture<AprobarJefePapeletaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AprobarJefePapeletaDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AprobarJefePapeletaDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
