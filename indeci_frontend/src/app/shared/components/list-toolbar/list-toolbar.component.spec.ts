import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ListToolbarComponent } from './list-toolbar.component';

describe('ListToolbarComponent', () => {
  it('muestra contador y emite búsqueda', () => {
    const fixture = TestBed.createComponent(ListToolbarComponent);
    fixture.componentRef.setInput('filteredCount', 3);
    fixture.componentRef.setInput('totalCount', 10);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.toolbar__count')?.textContent).toContain('3 de 10');

    let emitted = '';
    fixture.componentInstance.searchChange.subscribe((v) => {
      emitted = v;
    });
    const input = root.querySelector('input') as HTMLInputElement;
    input.value = 'admin';
    input.dispatchEvent(new Event('input'));
    expect(emitted).toBe('admin');
  });
});
