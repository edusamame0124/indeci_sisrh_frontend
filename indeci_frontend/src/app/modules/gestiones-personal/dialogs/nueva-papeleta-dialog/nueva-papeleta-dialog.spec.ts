import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevaPapeletaDialog } from './nueva-papeleta-dialog';

describe('NuevaPapeletaDialog', () => {
  let component: NuevaPapeletaDialog;
  let fixture: ComponentFixture<NuevaPapeletaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaPapeletaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevaPapeletaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
