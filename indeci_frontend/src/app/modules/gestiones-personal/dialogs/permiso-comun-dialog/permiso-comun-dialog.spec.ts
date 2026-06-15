import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermisoComunDialog } from './permiso-comun-dialog';

describe('PermisoComunDialog', () => {
  let component: PermisoComunDialog;
  let fixture: ComponentFixture<PermisoComunDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermisoComunDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermisoComunDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
