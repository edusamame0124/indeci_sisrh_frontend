import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { switchMap, of, type Observable } from 'rxjs';
import { EventoPeriodoApiService } from '../../services/evento-periodo-api.service';
import { LegajoDocumentoApiService } from '../../services/legajo-documento-api.service';
import type { LegajoDocumentoResponse } from '../../models/legajo-documento.model';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type {
  EventoPeriodoRequest,
  EventoPeriodoResponse,
  TipoEvento,
} from '../../models/evento-periodo.model';
import type { LegajoCategoria } from '../../models/legajo-documento.model';

/** Datos que el caller le pasa al dialog. */
export interface EventoPeriodoDialogData {
  readonly empleadoId: number;
  readonly tipos: readonly TipoEvento[];
  /** Categorías del legajo para resolver el destino del adjunto. */
  readonly categoriasLegajo: readonly LegajoCategoria[];
  /** Si viene seteado, modo edición (sin upload todavía). */
  readonly evento?: EventoPeriodoResponse | null;
}

/**
 * F3.6d — Dialog de creación/edición de evento del período.
 *
 * <p>Flujo de creación con adjunto (decisión RRHH F2.5/F2.6):</p>
 * <ol>
 *   <li>Si el tipo seleccionado tiene {@code requiereAdjunto='S'} y el usuario
 *       escogió un archivo → se sube primero al legajo. Backend devuelve un
 *       id que enlazamos como {@code sustentoLegajoDocId} del evento.</li>
 *   <li>Luego se POST al endpoint de evento con el id del adjunto.</li>
 * </ol>
 *
 * <p>Decisión de UX: cuando el tipo NO requiere adjunto, el campo de archivo
 * sigue visible pero opcional (RRHH puede agregar un sustento si quiere).</p>
 */
@Component({
  selector: 'app-evento-periodo-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evento-periodo-form-dialog.component.html',
  styleUrl: './evento-periodo-form-dialog.component.css',
})
export class EventoPeriodoFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EventoPeriodoApiService);
  private readonly legajoApi = inject(LegajoDocumentoApiService);
  private readonly dialogRef =
    inject<MatDialogRef<EventoPeriodoFormDialogComponent, EventoPeriodoResponse | null>>(MatDialogRef);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly data = inject<EventoPeriodoDialogData>(MAT_DIALOG_DATA);

  readonly submitting = signal(false);
  readonly archivoSeleccionado = signal<File | null>(null);

  readonly form = this.fb.nonNullable.group({
    tipoEventoId: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
    fechaInicio: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    fechaFin: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    diasAfectos: this.fb.nonNullable.control<number | null>(null),
    observacion: this.fb.nonNullable.control<string>(''),
  });

  /** Tipo de evento actualmente seleccionado en el formulario. */
  readonly tipoSeleccionado = computed<TipoEvento | null>(() => {
    const id = this.form.controls.tipoEventoId.value;
    if (!id) return null;
    return this.data.tipos.find((t) => t.id === id) ?? null;
  });

  /** Texto humano de los flags del tipo seleccionado para guiar al usuario. */
  readonly tipoMetadata = computed(() => {
    const t = this.tipoSeleccionado();
    if (!t) return null;
    const flags: string[] = [];
    if (t.afectaDiasLaborados === 'S') flags.push('Afecta días laborados');
    if (t.generaSubsidio === 'S') flags.push('Genera subsidio EsSalud');
    if (t.requiereAdjunto === 'S') flags.push('Requiere sustento');
    if (t.permiteSolape === 'S') flags.push('Permite solape');
    return flags.length ? flags.join(' · ') : 'Sin afectaciones adicionales';
  });

  readonly modoEdicion = computed(() => this.data.evento != null);
  readonly titulo = computed(() =>
    this.modoEdicion() ? 'Editar evento del período' : 'Registrar evento del período',
  );

  constructor() {
    // Pre-cargar en modo edición.
    const e = this.data.evento;
    if (e) {
      this.form.patchValue({
        tipoEventoId: e.tipoEventoId,
        fechaInicio: e.fechaInicio ? new Date(e.fechaInicio) : null,
        fechaFin: e.fechaFin ? new Date(e.fechaFin) : null,
        diasAfectos: e.diasAfectos ?? null,
        observacion: e.observacion ?? '',
      });
    }
  }

  // ====================== Acciones ======================

  onArchivoSeleccionado(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.archivoSeleccionado.set(file);
  }

  limpiarArchivo(): void {
    this.archivoSeleccionado.set(null);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const tipo = this.tipoSeleccionado();
    if (!tipo) return;
    const archivo = this.archivoSeleccionado();
    if (
      !this.modoEdicion() &&
      tipo.requiereAdjunto === 'S' &&
      !archivo
    ) {
      this.snack.open(
        'Este tipo de evento requiere un sustento documental adjunto.',
        'Cerrar',
        { duration: 6000 },
      );
      return;
    }

    this.submitting.set(true);

    // Sub-paso 1: si hay archivo, subir al legajo primero.
    const legajoUpload$: Observable<LegajoDocumentoResponse | null> = archivo
      ? this.legajoApi.upload(
          archivo,
          this.data.empleadoId,
          this.resolverCategoriaParaTipo(tipo),
          {
            origen: 'EVENTO',
            observacion: `Sustento de evento ${tipo.codigo}`,
          },
        )
      : of(null);

    legajoUpload$
      .pipe(
        switchMap((doc) => {
          const dto: EventoPeriodoRequest = {
            empleadoId: this.data.empleadoId,
            tipoEventoId: tipo.id,
            fechaInicio: this.toIso(this.form.controls.fechaInicio.value),
            fechaFin: this.toIso(this.form.controls.fechaFin.value),
            diasAfectos: this.form.controls.diasAfectos.value ?? null,
            sustentoLegajoDocId: doc?.id ?? this.data.evento?.sustentoLegajoDocId ?? null,
            observacion: this.form.controls.observacion.value || null,
          };
          return this.modoEdicion()
            ? this.api.actualizar(this.data.evento!.id, dto)
            : this.api.crear(dto);
        }),
      )
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.snack.open(
            this.modoEdicion() ? 'Evento actualizado' : 'Evento registrado',
            'Cerrar',
            { duration: 4000 },
          );
          this.dialogRef.close(res);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          const body = err.error;
          const msg = isErrorResponse(body)
            ? this.errors.translate(body.mensaje)
            : this.errors.translate(null);
          this.snack.open(msg, 'Cerrar', { duration: 7000 });
        },
      });
  }

  // ====================== Helpers ======================

  /**
   * Mapea el tipo de evento a la categoría del legajo donde irá el sustento.
   * Mapeo intencional: SUBSIDIO/CESE/LICENCIA → categorías ya sembradas en
   * V010_35 ("Subsidios", "Permisos y licencias", "Resoluciones"). Si no
   * encuentra match, cae a "Otros".
   */
  private resolverCategoriaParaTipo(tipo: TipoEvento): number {
    const codigo = tipo.codigo.toUpperCase();
    const buscar = (n: string) =>
      this.data.categoriasLegajo.find(
        (c) => c.nombre.toLowerCase() === n.toLowerCase(),
      );

    let cat: LegajoCategoria | undefined;
    if (codigo === 'MATERNIDAD' || codigo === 'ENFERMEDAD' || codigo === 'LACTANCIA') {
      cat = buscar('Subsidios');
    } else if (codigo.startsWith('LICENCIA') || codigo === 'PATERNIDAD' || codigo === 'PERMISO_PERSONAL') {
      cat = buscar('Permisos y licencias');
    } else if (codigo === 'CESE') {
      cat = buscar('Resoluciones');
    }
    cat = cat ?? buscar('Otros') ?? this.data.categoriasLegajo[0];
    if (!cat) {
      throw new Error('No hay categorías de legajo activas en BD');
    }
    return cat.id;
  }

  /** Convierte Date a ISO yyyy-MM-dd (formato esperado por el backend). */
  private toIso(value: Date | null): string {
    if (!value) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
