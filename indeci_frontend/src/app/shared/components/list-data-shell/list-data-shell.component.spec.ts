import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ListDataShellComponent } from './list-data-shell.component';

describe('ListDataShellComponent', () => {
  it('muestra empty cuando totalCount es 0', () => {
    const fixture = TestBed.createComponent(ListDataShellComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('totalCount', 0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sisrh-empty-state__title')?.textContent).toContain(
      'Sin registros',
    );
  });

  it('muestra spinner cuando loading', () => {
    const fixture = TestBed.createComponent(ListDataShellComponent);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-progress-spinner')).toBeTruthy();
  });
});
