import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CapacitacionDialog } from './capacitacion-dialog';

describe('CapacitacionDialog', () => {
  let component: CapacitacionDialog;
  let fixture: ComponentFixture<CapacitacionDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapacitacionDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CapacitacionDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
