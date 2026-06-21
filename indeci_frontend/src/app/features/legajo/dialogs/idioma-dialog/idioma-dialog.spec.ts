import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdiomaDialog } from './idioma-dialog';

describe('IdiomaDialog', () => {
  let component: IdiomaDialog;
  let fixture: ComponentFixture<IdiomaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdiomaDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdiomaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
