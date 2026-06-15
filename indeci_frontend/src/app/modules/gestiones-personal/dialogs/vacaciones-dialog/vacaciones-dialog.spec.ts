import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VacacionesDialog } from './vacaciones-dialog';

describe('VacacionesDialog', () => {
  let component: VacacionesDialog;
  let fixture: ComponentFixture<VacacionesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VacacionesDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VacacionesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
