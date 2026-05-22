import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { QrDisplayComponent } from './qr-display.component';

describe('QrDisplayComponent', () => {
  it('renders <img> with src=qr() and accessible alt text when qr is provided', () => {
    TestBed.configureTestingModule({ imports: [QrDisplayComponent] });
    const fixture = TestBed.createComponent(QrDisplayComponent);
    fixture.componentRef.setInput('qr', 'data:image/png;base64,FAKEQR==');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img.qr-image') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toBe('data:image/png;base64,FAKEQR==');
    expect(img.alt).toContain('Código QR');
    expect(img.alt.length).toBeGreaterThan(20); // a11y: alt descriptivo, no solo "QR"
  });

  it('shows generating placeholder when qr is empty', () => {
    TestBed.configureTestingModule({ imports: [QrDisplayComponent] });
    const fixture = TestBed.createComponent(QrDisplayComponent);
    fixture.componentRef.setInput('qr', '');
    fixture.detectChanges();

    const placeholder = fixture.nativeElement.querySelector('.qr-surface--empty');
    const img = fixture.nativeElement.querySelector('img.qr-image');
    expect(placeholder).toBeTruthy();
    expect(img).toBeNull();
    expect(placeholder.getAttribute('role')).toBe('status');
    expect(placeholder.getAttribute('aria-live')).toBe('polite');
    expect(placeholder.textContent).toContain('Generando');
  });

  it('shows a bordered surface framing the QR image', () => {
    TestBed.configureTestingModule({ imports: [QrDisplayComponent] });
    const fixture = TestBed.createComponent(QrDisplayComponent);
    fixture.componentRef.setInput('qr', 'data:image/png;base64,FAKEQR==');
    fixture.detectChanges();

    const surface = fixture.nativeElement.querySelector('.qr-surface');
    const img = fixture.nativeElement.querySelector('img.qr-image');
    expect(surface).toBeTruthy();
    expect(img).toBeTruthy();
  });

  it('onLoaded() flips loaded signal and clears errored', () => {
    TestBed.configureTestingModule({ imports: [QrDisplayComponent] });
    const fixture = TestBed.createComponent(QrDisplayComponent);
    fixture.componentRef.setInput('qr', 'data:image/png;base64,FAKEQR==');
    fixture.detectChanges();

    fixture.componentInstance.onError();
    expect(fixture.componentInstance.errored()).toBe(true);
    expect(fixture.componentInstance.loaded()).toBe(false);

    fixture.componentInstance.onLoaded();
    expect(fixture.componentInstance.loaded()).toBe(true);
    expect(fixture.componentInstance.errored()).toBe(false);
  });
});
