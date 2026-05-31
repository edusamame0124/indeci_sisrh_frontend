import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnviarPapeletaDialog } from './enviar-papeleta-dialog';

describe('EnviarPapeletaDialog', () => {
  let component: EnviarPapeletaDialog;
  let fixture: ComponentFixture<EnviarPapeletaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnviarPapeletaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnviarPapeletaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
