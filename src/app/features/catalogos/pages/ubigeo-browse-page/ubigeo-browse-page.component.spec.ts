import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UbigeoBrowsePageComponent } from './ubigeo-browse-page.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('UbigeoBrowsePageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UbigeoBrowsePageComponent],
      providers: [
        provideAnimationsAsync('noop'),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MatSnackBar,
          useValue: { open: () => undefined },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function ubigeoRowsManyDistritos(): ReadonlyArray<{
    id: string;
    distrito: string;
    provincia: string;
    departamento: string;
  }> {
    const rows: { id: string; distrito: string; provincia: string; departamento: string }[] = [];
    for (let i = 1; i <= 11; i += 1) {
      rows.push({
        id: `150130${String(i).padStart(3, '0')}`,
        distrito: `DISTRITO TEST ${i}`,
        provincia: 'LIMA',
        departamento: 'LIMA',
      });
    }
    return rows;
  }

  it('carga ubigeo y muestra departamentos', () => {
    const fixture = TestBed.createComponent(UbigeoBrowsePageComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/catalogos/ubigeo');
    expect(req.request.method).toBe('GET');
    req.flush({
      estado: 'OK',
      mensaje: 'ok',
      data: [
        {
          id: '150131',
          distrito: 'SAN ISIDRO',
          provincia: 'LIMA',
          departamento: 'LIMA',
        },
      ],
    });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent ?? '').toContain('LIMA');
  });

  it('distritos: tabla con sisrh-table-scroll y paginador accesible', () => {
    const fixture = TestBed.createComponent(UbigeoBrowsePageComponent);
    const host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    httpMock.expectOne('/api/catalogos/ubigeo').flush({
      estado: 'OK',
      mensaje: 'ok',
      data: ubigeoRowsManyDistritos(),
    });
    fixture.detectChanges();

    const deptoSection = host.querySelector('section[aria-labelledby="ubigeo-depto-title"]');
    const deptoBtn = [...(deptoSection?.querySelectorAll('button[role="option"]') ?? [])].find(
      (b) => b.textContent?.trim() === 'LIMA',
    );
    expect(deptoBtn).toBeTruthy();
    deptoBtn!.click();
    fixture.detectChanges();

    const provSection = host.querySelector('section[aria-labelledby="ubigeo-prov-title"]');
    const provBtn = [...(provSection?.querySelectorAll('button[role="option"]') ?? [])].find(
      (b) => b.textContent?.trim() === 'LIMA',
    );
    expect(provBtn).toBeTruthy();
    provBtn!.click();
    fixture.detectChanges();

    expect(host.querySelector('.sisrh-table-scroll table.tbl')).toBeTruthy();
    const paginator = host.querySelector('mat-paginator');
    expect(paginator?.getAttribute('aria-label')).toBe('Paginador de distritos ubigeo');
  });
});
