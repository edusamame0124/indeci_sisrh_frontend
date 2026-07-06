import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { TrazabilidadPapeletaDialogComponent } from './trazabilidad-papeleta-dialog';

describe('TrazabilidadPapeletaDialog', () => {
  let component: TrazabilidadPapeletaDialogComponent;
  let fixture: ComponentFixture<TrazabilidadPapeletaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrazabilidadPapeletaDialogComponent],
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

    fixture = TestBed.createComponent(TrazabilidadPapeletaDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
