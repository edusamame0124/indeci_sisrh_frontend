import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
  type CatalogoRow,
} from './catalogo-readonly-page.component';

function buildConfig(
  rows: readonly CatalogoRow[] = [],
  overrides: Partial<CatalogoReadonlyConfig> = {},
): CatalogoReadonlyConfig {
  return {
    titulo: 'Test',
    fetchFn: () => of(rows),
    columnas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
    ],
    searchKeys: ['codigo', 'nombre'],
    ...overrides,
  };
}

describe('CatalogoReadonlyPageComponent (Spec 009 — base catálogo)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CatalogoReadonlyPageComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync('noop'),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga rows y construye columnKeys a partir del config', () => {
    const fixture = TestBed.createComponent(CatalogoReadonlyPageComponent);
    fixture.componentInstance.config = buildConfig([
      { codigo: 'M', nombre: 'Masculino' },
      { codigo: 'F', nombre: 'Femenino' },
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance.rows().length).toBe(2);
    expect(fixture.componentInstance.columnKeys()).toEqual(['codigo', 'nombre']);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('filteredRows aplica búsqueda case-insensitive sobre searchKeys', () => {
    const fixture = TestBed.createComponent(CatalogoReadonlyPageComponent);
    fixture.componentInstance.config = buildConfig([
      { codigo: 'M', nombre: 'Masculino' },
      { codigo: 'F', nombre: 'Femenino' },
      { codigo: 'X', nombre: 'No binario' },
    ]);
    fixture.detectChanges();

    // Assert precondiciones del estado.
    expect(fixture.componentInstance.rows().length).toBe(3);

    fixture.componentInstance.searchQuery.set('masc');
    fixture.detectChanges();
    expect(fixture.componentInstance.searchQuery()).toBe('masc');
    const matches = fixture.componentInstance.filteredRows();
    expect(matches.map((r) => r['nombre'])).toEqual(['Masculino']);

    // 'binario' aparece solo en row 3 (los demás nombres contienen 'no' como sufijo).
    fixture.componentInstance.searchQuery.set('BINARIO');
    fixture.detectChanges();
    expect(fixture.componentInstance.filteredRows().map((r) => r['codigo'])).toEqual(['X']);

    fixture.componentInstance.searchQuery.set('');
    fixture.detectChanges();
    expect(fixture.componentInstance.filteredRows().length).toBe(3);
  });

  it('pagedRows respeta pageIndex y pageSize', () => {
    const fixture = TestBed.createComponent(CatalogoReadonlyPageComponent);
    const sample: CatalogoRow[] = Array.from({ length: 60 }, (_, i) => ({
      codigo: `K${i}`,
      nombre: `Nombre ${i}`,
    }));
    fixture.componentInstance.config = buildConfig(sample);
    fixture.detectChanges();
    fixture.componentInstance.pageSize.set(25);
    expect(fixture.componentInstance.pagedRows().length).toBe(25);
    fixture.componentInstance.pageIndex.set(2);
    expect(fixture.componentInstance.pagedRows().length).toBe(10);
  });

  it('formatCell usa formatter cuando se provee, y "—" cuando el valor es null', () => {
    const fixture = TestBed.createComponent(CatalogoReadonlyPageComponent);
    fixture.componentInstance.config = buildConfig([{ codigo: null, nombre: 'X' }], {
      columnas: [
        {
          key: 'codigo',
          label: 'Código',
          formatter: (v) => (v == null ? 'sin código' : String(v).toUpperCase()),
        },
        { key: 'nombre', label: 'Nombre' },
      ],
    });
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp.formatCell({ codigo: null, nombre: 'X' }, comp.effectiveConfig().columnas[0])).toBe(
      'sin código',
    );
    expect(comp.formatCell({ codigo: 'm' }, comp.effectiveConfig().columnas[0])).toBe('M');
    expect(comp.formatCell({ nombre: null }, comp.effectiveConfig().columnas[1])).toBe('—');
  });

  it('expone errorMessage cuando fetchFn falla', () => {
    const fixture = TestBed.createComponent(CatalogoReadonlyPageComponent);
    fixture.componentInstance.config = buildConfig([], {
      fetchFn: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              error: {
                status: 403,
                mensaje: 'No tiene permisos para esta operación',
                requiereCaptcha: false,
              },
            }),
        ),
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.errorMessage()).toContain('permisos');
  });

  it('onSearchInput resetea pageIndex a 0', () => {
    const fixture = TestBed.createComponent(CatalogoReadonlyPageComponent);
    fixture.componentInstance.config = buildConfig([{ codigo: 'A', nombre: 'B' }]);
    fixture.detectChanges();
    fixture.componentInstance.pageIndex.set(3);
    fixture.componentInstance.onSearchInput({
      target: { value: 'test' },
    } as unknown as Event);
    expect(fixture.componentInstance.pageIndex()).toBe(0);
    expect(fixture.componentInstance.searchQuery()).toBe('test');
  });
});
