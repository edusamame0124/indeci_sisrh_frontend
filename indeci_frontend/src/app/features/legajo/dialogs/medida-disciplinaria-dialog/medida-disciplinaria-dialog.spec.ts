import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedidaDisciplinariaDialog } from './medida-disciplinaria-dialog';

describe('MedidaDisciplinariaDialog', () => {
  let component: MedidaDisciplinariaDialog;
  let fixture: ComponentFixture<MedidaDisciplinariaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedidaDisciplinariaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedidaDisciplinariaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
