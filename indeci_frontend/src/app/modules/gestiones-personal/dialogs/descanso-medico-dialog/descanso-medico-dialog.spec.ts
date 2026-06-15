import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DescansoMedicoDialog } from './descanso-medico-dialog';

describe('DescansoMedicoDialog', () => {
  let component: DescansoMedicoDialog;
  let fixture: ComponentFixture<DescansoMedicoDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DescansoMedicoDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DescansoMedicoDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
