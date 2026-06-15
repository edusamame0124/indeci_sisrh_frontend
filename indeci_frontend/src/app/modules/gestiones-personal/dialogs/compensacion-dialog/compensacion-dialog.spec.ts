import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompensacionDialog } from './compensacion-dialog';

describe('CompensacionDialog', () => {
  let component: CompensacionDialog;
  let fixture: ComponentFixture<CompensacionDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompensacionDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompensacionDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
