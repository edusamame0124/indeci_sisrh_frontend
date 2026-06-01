import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrazabilidadPapeletaDialog } from './trazabilidad-papeleta-dialog';

describe('TrazabilidadPapeletaDialog', () => {
  let component: TrazabilidadPapeletaDialog;
  let fixture: ComponentFixture<TrazabilidadPapeletaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrazabilidadPapeletaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrazabilidadPapeletaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
