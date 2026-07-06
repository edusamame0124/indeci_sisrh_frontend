import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AprobarJefePapeletaDialogComponent } from './aprobar-jefe-papeleta-dialog';

describe('AprobarJefePapeletaDialog', () => {
  let component: AprobarJefePapeletaDialogComponent;
  let fixture: ComponentFixture<AprobarJefePapeletaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AprobarJefePapeletaDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
        provideNativeDateAdapter(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AprobarJefePapeletaDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
