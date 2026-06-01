import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ClientTelemetryService } from '../../../core/services/client-telemetry.service';
import { environment } from '../../../../environments/environment';
import {
  SISTEMAS_METADATA,
  SistemaCard,
  SistemaCardRole,
  SistemaMetadata,
} from '../models/sistema.model';

/**
 * Fase 3 SSO — Construye las cards del Portal Selector.
 *
 * Combina el claim {@code sistemas} del JWT (signal `AuthService.sistemas`)
 * con el catálogo visual estático {@link SISTEMAS_METADATA} y las URLs de
 * `environment.sistemasExternos`. Una card aparece como BLOQUEADA si el
 * usuario no tiene roles en ese sistema (esto se respeta en el componente
 * pero el service no la filtra — es decisión del UI).
 *
 * Reglas:
 *   - SIEMPRE aparece la card de SISRH (aunque el JWT no la incluya,
 *     fallback defensive).
 *   - Solo se pintan sistemas que están en {@link SISTEMAS_METADATA}.
 *     Sistemas en el JWT pero no en metadata se loguean como warning y se
 *     ignoran (señal de que el frontend está desactualizado).
 *   - Ordenadas por {@code orden} ASC.
 */
@Injectable({ providedIn: 'root' })
export class SistemaSelectorService {
  private readonly auth = inject(AuthService);
  private readonly telemetry = inject(ClientTelemetryService);

  /**
   * Cards listas para renderizar. Se recomputa cuando cambia `auth.sistemas()`.
   */
  readonly cards = computed<ReadonlyArray<SistemaCard>>(() => {
    const sistemasClaim = this.auth.sistemas();
    const cards: SistemaCard[] = [];

    for (const meta of SISTEMAS_METADATA) {
      const rolesDelClaim = sistemasClaim[meta.codigo];
      const codigosRoles = rolesDelClaim ?? [];
      // SISRH: aunque el claim falte, la card se muestra con bloqueada si no hay roles.
      const isSisrh = meta.codigo === 'sisrh';
      // Para los externos: solo si el claim tiene una entrada explícita, los pintamos.
      // Si no aparece en el claim → el usuario no tiene asignación → no se pinta.
      if (!isSisrh && rolesDelClaim === undefined) {
        continue;
      }
      cards.push({
        codigo: meta.codigo,
        nombre: meta.nombre,
        descripcion: meta.descripcion,
        icono: meta.icono,
        orden: meta.orden,
        roles: this.resolveRoles(codigosRoles, meta),
        urlBase: this.resolveUrl(meta),
        bloqueada: codigosRoles.length === 0,
      });
    }

    // Defensive: si por algún motivo el JWT trae un código no conocido,
    // lo ignoramos pero lo registramos en consola para detectar drift.
    for (const codigo of Object.keys(sistemasClaim)) {
      if (!SISTEMAS_METADATA.some((m) => m.codigo === codigo)) {
        this.telemetry.track('ADMIN_MODULE_UI', {
          extra: { action: 'SSO_SELECTOR_METADATA_DRIFT', sistema: codigo },
        });
      }
    }

    return cards.sort((a, b) => a.orden - b.orden);
  });

  /**
   * Decide la ruta de salida cuando el usuario click una card.
   *  - SISRH: navegación interna (devuelve null para que el caller use el router).
   *  - Externo: URL absoluta con el access token apendido como query param
   *    `?token=<jwt>` para que el sistema externo lo capture.
   */
  buildClickTarget(card: SistemaCard, accessToken: string | null): string | null {
    if (card.bloqueada) return null;
    if (!card.urlBase) return null; // SISRH → caller navega internamente
    if (!accessToken) return card.urlBase;
    const separator = card.urlBase.includes('?') ? '&' : '?';
    return `${card.urlBase}${separator}token=${encodeURIComponent(accessToken)}`;
  }

  /**
   * Determina si solo hay 1 sistema con acceso (típicamente SISRH solo).
   * El LoginFlow lo usa para SALTAR el selector y redirigir directo.
   */
  readonly hasMultipleSystems = computed<boolean>(() => {
    return this.cards().filter((c) => !c.bloqueada).length > 1;
  });

  private resolveUrl(meta: SistemaMetadata): string | null {
    if (meta.urlEnvKey === null) return null;
    const url = environment.sistemasExternos?.[meta.urlEnvKey];
    return typeof url === 'string' && url.length > 0 ? url : null;
  }

  /**
   * Aplica el mapping {@link SistemaMetadata.rolesDisplay} a cada código del
   * claim. Códigos sin mapping se mantienen como label = code (formato crudo).
   */
  private resolveRoles(
    codigos: ReadonlyArray<string>,
    meta: SistemaMetadata,
  ): ReadonlyArray<SistemaCardRole> {
    const display = meta.rolesDisplay;
    return codigos.map<SistemaCardRole>((code) => ({
      code,
      label: display?.[code] ?? code,
    }));
  }
}
