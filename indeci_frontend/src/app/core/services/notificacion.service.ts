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
    // Se difiere un tick (setTimeout 0): si el toast se abre en el mismo instante en que el
    // overlay de un MatDialog se está desmontando (patrón afterClosed → http → éxito), el
    // CDK overlay lanza `HierarchyRequestError: The new child element contains the parent`.
    // Diferir la apertura desacopla el snackbar del teardown del diálogo y evita la carrera.
    setTimeout(() => {
      this.snack.openFromComponent(SuccessToastComponent, {
        data: { titulo, mensaje } satisfies SuccessToastData,
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: 'sisrh-snack-success',
      });
    });
  }

  /**
   * Toast de error (rojo). Úsalo cuando una operación falla y el usuario necesita
   * feedback inmediato (p. ej. no se pudo eliminar/enviar una papeleta).
   */
  error(mensaje: string): void {
    setTimeout(() => {
      this.snack.open(mensaje, 'Cerrar', {
        duration: 6000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: 'sisrh-snack-error',
      });
    });
  }
}
