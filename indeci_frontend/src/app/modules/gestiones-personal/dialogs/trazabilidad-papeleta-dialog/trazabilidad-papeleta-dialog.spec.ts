import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrazabilidadPapeletaDialogComponent } from './trazabilidad-papeleta-dialog';

describe('TrazabilidadPapeletaDialog', () => {
  let component: TrazabilidadPapeletaDialogComponent;
  let fixture: ComponentFixture<TrazabilidadPapeletaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrazabilidadPapeletaDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrazabilidadPapeletaDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
