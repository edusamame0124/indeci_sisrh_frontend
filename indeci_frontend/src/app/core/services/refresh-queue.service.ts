import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, take } from 'rxjs';

/**
 * Cola de peticiones durante el refresh transparente de token.
 *
 * Garantiza que ante N peticiones simultáneas con 401, solo se dispare UN
 * refresh (FR-024). Las demás esperan al `waitForNewToken$()` que emite
 * cuando llega el nuevo token, y luego reanudan con él.
 */
@Injectable({ providedIn: 'root' })
export class RefreshQueueService {
  /** null = sin refresh activo o sin token nuevo aún disponible. */
  private readonly _newToken$ = new BehaviorSubject<string | null>(null);
  private _isRefreshing = false;

  get isRefreshing(): boolean {
    return this._isRefreshing;
  }

  /** Marca inicio del refresh. Subsiguientes 401 caen en cola. */
  startRefresh(): void {
    this._isRefreshing = true;
    this._newToken$.next(null);
  }

  /** Refresh exitoso: notifica a las peticiones en cola con el nuevo token. */
  completeRefresh(newToken: string): void {
    this._isRefreshing = false;
    this._newToken$.next(newToken);
  }

  /** Refresh fallido: reset y las peticiones en cola serán dropeadas. */
  failRefresh(): void {
    this._isRefreshing = false;
    this._newToken$.next(null);
  }

  /**
   * Las peticiones en cola se suscriben aquí. Emite cuando llega un nuevo
   * token (string), o nunca si el refresh falla (caller debe manejar timeout).
   */
  waitForNewToken$(): Observable<string> {
    return this._newToken$.pipe(
      filter((t): t is string => t !== null),
      take(1),
    );
  }
}
