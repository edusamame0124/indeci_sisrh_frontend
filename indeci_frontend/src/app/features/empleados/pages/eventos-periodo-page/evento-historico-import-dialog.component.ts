import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap, takeWhile, timer } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { EventoPeriodoApiService } from '../../services/evento-periodo-api.service';
import type {
  EventoHistoricoFilaResultado,
  EventoHistoricoImportJob,
  EventoHistoricoImportResult,
} from '../../models/evento-periodo.model';

type EstadoImport = 'IDLE' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';

/**
 * V012_42 F2 — modal de carga única del Excel histórico "DEDUCCIONES DEL TIEMPO DE SERVICIOS"
 * (hoja "sistema"). Sube el archivo, hace polling del job asíncrono (mismo patrón que
 * {@code CargaMasivaCsvPageComponent} en Asistencia) y muestra el reporte fila-por-fila al
 * terminar. Carga única (Día 0) — no reemplaza el alta manual ni la materialización desde
 * papeleta, que siguen siendo el flujo operativo (Día 1).
 */
@Component({
  selector: 'app-evento-historico-import-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evento-historico-import-dialog.component.html',
  styleUrl: './evento-historico-import-dialog.component.css',
})
export class EventoHistoricoImportDialogComponent {
  private static readonly POLL_MS = 700;

  private readonly eventoApi = inject(EventoPeriodoApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef =
    inject<MatDialogRef<EventoHistoricoImportDialogComponent, boolean>>(MatDialogRef);

  readonly archivo = signal<File | null>(null);
  readonly estado = signal<EstadoImport>('IDLE');
  readonly progreso = signal(0);
  readonly fase = signal('');
  readonly resultado = signal<EventoHistoricoImportResult | null>(null);
  readonly errorMsg = signal<string | null>(null);

  readonly procesando = computed(() => this.estado() === 'PROCESANDO');
  readonly columnasFilas = ['numeroFila', 'dni', 'nombre', 'motivoExcel', 'estado', 'mensaje'] as const;

  /** Solo las filas que requieren atención de RR.HH. (todo lo que no sea OK). */
  readonly filasParaRevisar = computed(
    () => this.resultado()?.filas.filter((f) => f.estado !== 'OK') ?? [],
  );

  onArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
    this.resultado.set(null);
    this.errorMsg.set(null);
    this.estado.set('IDLE');
  }

  /**
   * Sube el archivo, dispara el job y hace polling declarativo (RxJS) hasta COMPLETADO/ERROR.
   * La suscripción se limpia sola si el usuario cierra el modal (takeUntilDestroyed).
   */
  iniciarImport(): void {
    const archivo = this.archivo();
    if (!archivo) return;

    this.estado.set('PROCESANDO');
    this.progreso.set(0);
    this.fase.set('Iniciando importación…');
    this.errorMsg.set(null);
    this.resultado.set(null);

    this.eventoApi
      .importarHistoricoAsync(archivo)
      .pipe(
        switchMap(({ jobId }) =>
          timer(0, EventoHistoricoImportDialogComponent.POLL_MS).pipe(
            switchMap(() => this.eventoApi.importarHistoricoJobEstado(jobId)),
            takeWhile((job) => job.estado === 'EN_COLA' || job.estado === 'PROCESANDO', true),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (job) => this.onJobUpdate(job),
        error: (err: HttpErrorResponse) => this.onError(err),
      });
  }

  /** Cierra el modal; avisa a la bandeja si hubo al menos una fila insertada (refresca la lista). */
  cerrar(): void {
    this.dialogRef.close((this.resultado()?.insertados ?? 0) > 0);
  }

  filaEstadoIcon(fila: EventoHistoricoFilaResultado): string {
    return fila.estado === 'ERROR' ? 'error' : 'info';
  }

  private onJobUpdate(job: EventoHistoricoImportJob): void {
    this.progreso.set(job.porcentaje);
    this.fase.set(job.fase);

    if (job.estado === 'COMPLETADO' && job.resultado) {
      this.progreso.set(100); // el 100% PERSISTE en pantalla, no desaparece
      this.estado.set('COMPLETADO');
      this.resultado.set(job.resultado);
    } else if (job.estado === 'ERROR') {
      this.estado.set('ERROR');
      this.errorMsg.set(job.error ?? 'La importación falló.');
    }
  }

  private onError(err: HttpErrorResponse): void {
    this.estado.set('ERROR');
    const body = err.error;
    this.errorMsg.set(
      isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null),
    );
  }
}
