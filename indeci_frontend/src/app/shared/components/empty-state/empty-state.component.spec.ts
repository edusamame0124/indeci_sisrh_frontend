import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';
import { setMatIconDefaultFontSetForTests } from '../../../testing/mat-icon-test-defaults';

describe('EmptyStateComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    });
    setMatIconDefaultFontSetForTests();
  });

  it('usa role status por defecto', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('icon', 'info');
    fixture.componentRef.setInput('title', 'Título');
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('.sisrh-empty-state') as HTMLElement;
    expect(root.getAttribute('role')).toBe('status');
    expect(root.classList.contains('sisrh-empty-state--error')).toBe(false);
  });

  it('variant error usa role alert y clase de error', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('icon', 'error_outline');
    fixture.componentRef.setInput('title', 'Error');
    fixture.componentRef.setInput('description', 'Detalle');
    fixture.componentRef.setInput('variant', 'error');
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('.sisrh-empty-state') as HTMLElement;
    expect(root.getAttribute('role')).toBe('alert');
    expect(root.classList.contains('sisrh-empty-state--error')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Detalle');
  });
});
