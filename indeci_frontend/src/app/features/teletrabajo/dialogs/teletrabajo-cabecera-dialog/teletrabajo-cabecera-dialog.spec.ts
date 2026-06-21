import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeletrabajoCabeceraDialog } from './teletrabajo-cabecera-dialog';

describe('TeletrabajoCabeceraDialog', () => {
  let component: TeletrabajoCabeceraDialog;
  let fixture: ComponentFixture<TeletrabajoCabeceraDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeletrabajoCabeceraDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeletrabajoCabeceraDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
