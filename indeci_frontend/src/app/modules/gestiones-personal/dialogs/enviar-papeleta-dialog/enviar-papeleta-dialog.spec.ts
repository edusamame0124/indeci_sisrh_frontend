import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnviarPapeletaDialogComponent } from './enviar-papeleta-dialog';

describe('EnviarPapeletaDialog', () => {
  let component: EnviarPapeletaDialogComponent;
  let fixture: ComponentFixture<EnviarPapeletaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnviarPapeletaDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnviarPapeletaDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
