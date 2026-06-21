import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FamiliarDialog } from './familiar-dialog';

describe('FamiliarDialog', () => {
  let component: FamiliarDialog;
  let fixture: ComponentFixture<FamiliarDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FamiliarDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FamiliarDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
