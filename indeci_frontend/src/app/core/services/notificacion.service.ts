import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  SuccessToastComponent,
  type SuccessToastData,
} from '../../shared/components/success-toast/success-toast.component';

/**
 * Notificaciones de la app. CONVENCIÓN del proyecto: tras CADA registro/edición
 * exitosa se muestra {@link exito} ("Registro exitoso") una sola vez.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly snack = inject(MatSnackBar);

  /**
   * Toast verde de éxito (estilo Flowbite). Úsalo tras crear/actualizar/eliminar.
   * @param mensaje detalle opcional (ej. "Planilla registrada").
   * @param titulo  encabezado; por defecto "Registro exitoso".
   */
  exito(mensaje?: string, titulo = 'Registro exitoso'): void {
    this.snack.openFromComponent(SuccessToastComponent, {
      data: { titulo, mensaje } satisfies SuccessToastData,
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: 'sisrh-snack-success',
    });
  }
}
