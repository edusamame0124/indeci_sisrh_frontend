import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AprobarRrhhPapeletaDialogComponent } from './aprobar-rrhh-papeleta-dialog';

describe('AprobarRrhhPapeletaDialog', () => {
  let component: AprobarRrhhPapeletaDialogComponent;
  let fixture: ComponentFixture<AprobarRrhhPapeletaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AprobarRrhhPapeletaDialogComponent],
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

    fixture = TestBed.createComponent(AprobarRrhhPapeletaDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
