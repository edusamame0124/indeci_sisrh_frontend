import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LactanciaDialog } from './lactancia-dialog';

describe('LactanciaDialog', () => {
  let component: LactanciaDialog;
  let fixture: ComponentFixture<LactanciaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LactanciaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LactanciaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
