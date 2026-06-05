import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevaPapeletaDialogComponent } from './nueva-papeleta-dialog';

describe('NuevaPapeletaDialog', () => {
  let component: NuevaPapeletaDialogComponent;
  let fixture: ComponentFixture<NuevaPapeletaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaPapeletaDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevaPapeletaDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
