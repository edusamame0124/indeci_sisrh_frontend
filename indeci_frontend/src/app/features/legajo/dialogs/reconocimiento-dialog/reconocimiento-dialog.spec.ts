import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReconocimientoDialog } from './reconocimiento-dialog';

describe('ReconocimientoDialog', () => {
  let component: ReconocimientoDialog;
  let fixture: ComponentFixture<ReconocimientoDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReconocimientoDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReconocimientoDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
