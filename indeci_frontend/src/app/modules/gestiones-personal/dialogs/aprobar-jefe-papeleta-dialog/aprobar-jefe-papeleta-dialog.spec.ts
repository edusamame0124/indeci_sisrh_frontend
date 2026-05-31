import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AprobarJefePapeletaDialog } from './aprobar-jefe-papeleta-dialog';

describe('AprobarJefePapeletaDialog', () => {
  let component: AprobarJefePapeletaDialog;
  let fixture: ComponentFixture<AprobarJefePapeletaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AprobarJefePapeletaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AprobarJefePapeletaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
