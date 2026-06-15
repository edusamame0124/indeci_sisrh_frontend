import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LicenciaDialog } from './licencia-dialog';

describe('LicenciaDialog', () => {
  let component: LicenciaDialog;
  let fixture: ComponentFixture<LicenciaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LicenciaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LicenciaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
