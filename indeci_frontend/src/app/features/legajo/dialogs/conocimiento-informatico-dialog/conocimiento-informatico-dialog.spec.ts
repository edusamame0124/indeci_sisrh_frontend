import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConocimientoInformaticoDialog } from './conocimiento-informatico-dialog';

describe('ConocimientoInformaticoDialog', () => {
  let component: ConocimientoInformaticoDialog;
  let fixture: ComponentFixture<ConocimientoInformaticoDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConocimientoInformaticoDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConocimientoInformaticoDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
