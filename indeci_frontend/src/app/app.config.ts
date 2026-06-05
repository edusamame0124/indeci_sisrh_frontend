import {
  ApplicationConfig,
  PLATFORM_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorRoutingInterceptor } from './core/interceptors/error-routing.interceptor';
import { MatIconRegistry } from '@angular/material/icon';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from './core/services/auth.service';
import { TokenStorageService } from './core/services/token-storage.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorRoutingInterceptor])),
    provideAnimationsAsync(),
    // Fechas del datepicker de Material en formato peruano DD/MM/AAAA.
    { provide: MAT_DATE_LOCALE, useValue: 'es-PE' },
    // Sin almacenamiento local no hay flujo auth (FR-030) — debe ir antes de hidratar.
    provideAppInitializer(() => {
      const platformId = inject(PLATFORM_ID);
      if (!isPlatformBrowser(platformId)) return;
      const storage = inject(TokenStorageService);
      const router = inject(Router);
      if (!storage.isAvailable()) {
        void router.navigate(['/auth', 'storage-error'], { replaceUrl: true });
      }
    }),
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      auth.hydrateFromStorage();
    }),
    provideAppInitializer(() => {
      const platformId = inject(PLATFORM_ID);
      if (!isPlatformBrowser(platformId)) return;
      inject(MatIconRegistry).setDefaultFontSetClass(
        'material-symbols-outlined',
        'mat-ligature-font',
      );
    }),
  ],
};
