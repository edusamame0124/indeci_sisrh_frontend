import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
  input,
  output,
} from '@angular/core';
import { ClientTelemetryService } from '../../../core/services/client-telemetry.service';

/**
 * Wrapper standalone para Cloudflare Turnstile.
 *
 * Carga dinámica del script desde challenges.cloudflare.com (solo en browser).
 * Si no carga en 5 segundos → emite `error` (el padre debe bloquear el envío) (FR-004, Q4).
 */

interface TurnstileGlobal {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
      language?: string;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const LOAD_TIMEOUT_MS = 5000;

@Component({
  selector: 'app-turnstile-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #container aria-label="Verificador humano Cloudflare"></div>`,
})
export class TurnstileWidgetComponent implements AfterViewInit, OnDestroy {
  readonly siteKey = input.required<string>();
  readonly verified = output<string>();
  readonly errorEvent = output<void>();

  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly telemetry = inject(ClientTelemetryService);
  private widgetId: string | null = null;
  private loadTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadScriptAndRender();
  }

  ngOnDestroy(): void {
    if (this.loadTimeoutId !== null) clearTimeout(this.loadTimeoutId);
    if (this.widgetId !== null && window.turnstile) {
      try {
        window.turnstile.remove(this.widgetId);
      } catch {
        /* noop */
      }
    }
  }

  reset(): void {
    if (this.widgetId !== null && window.turnstile) {
      window.turnstile.reset(this.widgetId);
    }
  }

  private loadScriptAndRender(): void {
    // Si ya cargó (otra instancia previa), render directo
    if (window.turnstile) {
      this.render();
      return;
    }

    // Verificar si script ya está en el DOM (carga en curso)
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      this.startLoadTimeout();
      existing.addEventListener('load', () => this.render());
      return;
    }

    // Inyectar script
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;

    this.startLoadTimeout();

    script.onload = (): void => this.render();
    script.onerror = (): void => this.handleLoadError();

    document.head.appendChild(script);
  }

  private startLoadTimeout(): void {
    this.loadTimeoutId = setTimeout(() => {
      if (!window.turnstile) this.handleLoadError();
    }, LOAD_TIMEOUT_MS);
  }

  private render(): void {
    if (this.loadTimeoutId !== null) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }
    if (!window.turnstile) {
      this.handleLoadError();
      return;
    }
    try {
      this.widgetId = window.turnstile.render(this.container.nativeElement, {
        sitekey: this.siteKey(),
        callback: (token: string) => this.verified.emit(token),
        'error-callback': () => this.handleLoadError(),
        'expired-callback': () => this.reset(),
        theme: 'light',
        language: 'es',
      });
    } catch {
      this.handleLoadError();
    }
  }

  private handleLoadError(): void {
    if (this.loadTimeoutId !== null) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }
    this.telemetry.track('TURNSTILE_LOAD_FAILED');
    this.errorEvent.emit();
  }
}
