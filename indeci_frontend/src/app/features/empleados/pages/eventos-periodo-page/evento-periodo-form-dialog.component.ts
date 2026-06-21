import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { debounceTime, distinctUntilChanged, of, startWith, switchMap, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { EventoPeriodoApiService } from '../../services/evento-periodo-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
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
import type { PersonaResumen } from '../../models/persona-empleado.model';

export interface EventoPeriodoDialogData {
  /** Null al crear — el usuario elige empleado en el modal. */
  readonly empleadoId: number | null;
  readonly empleadoNombre?: string | null;
  readonly empleadoDni?: string | null;
  readonly tipos: readonly TipoEvento[];
  readonly categoriasLegajo: readonly LegajoCategoria[];
  readonly evento?: EventoPeriodoResponse | null;
}

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
    MatAutocompleteModule,
  ],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evento-periodo-form-dialog.component.html',
  styleUrl: './evento-periodo-form-dialog.component.css',
})
export class EventoPeriodoFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EventoPeriodoApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly legajoApi = inject(LegajoDocumentoApiService);
  private readonly dialogRef =
    inject<MatDialogRef<EventoPeriodoFormDialogComponent, EventoPeriodoResponse | null>>(MatDialogRef);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = inject<EventoPeriodoDialogData>(MAT_DIALOG_DATA);

  readonly submitting = signal(false);
  readonly archivoSeleccionado = signal<File | null>(null);
  readonly empleadoSeleccionado = signal<PersonaResumen | null>(null);
  readonly empleadoOpciones = signal<readonly PersonaResumen[]>([]);
  readonly buscandoEmpleados = signal(false);
  readonly empleadoCtrl = this.fb.nonNullable.control('');

  readonly form = this.fb.nonNullable.group({
    tipoEventoId: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
    fechaInicio: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    fechaFin: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    diasAfectos: this.fb.nonNullable.control<number | null>(null),
    observacion: this.fb.nonNullable.control<string>(''),
  });

  private readonly tipoEventoIdSig = toSignal(
    this.form.controls.tipoEventoId.valueChanges.pipe(
      startWith(this.form.controls.tipoEventoId.value),
    ),
    { initialValue: this.form.controls.tipoEventoId.value },
  );

  readonly tipoSeleccionado = computed<TipoEvento | null>(() => {
    const id = this.tipoEventoIdSig();
    if (id == null) return null;
    const numericId = typeof id === 'string' ? Number(id) : id;
    if (Number.isNaN(numericId)) return null;
    return this.data.tipos.find((t) => t.id === numericId) ?? null;
  });

  readonly tipoMetadata = computed(() => {
    const t = this.tipoSeleccionado();
    if (!t) return null;
    const flags: string[] = [];
    if (t.afectaDiasLaborados === 'S') flags.push('Afecta días laborados');
    if (t.requiereAdjunto === 'S') flags.push('Requiere sustento');
    if (t.permiteSolape === 'S') flags.push('Permite solape');
    return flags.length ? flags.join(' · ') : 'Sin afectaciones adicionales';
  });

  readonly puedeRegistrar = computed(() => {
    if (this.submitting()) return false;
    if (!this.modoEdicion() && !this.empleadoSeleccionado()?.empleadoId) return false;
    return !this.form.invalid;
  });

  readonly modoEdicion = computed(() => this.data.evento != null);
  readonly titulo = computed(() =>
    this.modoEdicion() ? 'Editar evento del período' : 'Registrar evento del período',
  );

  readonly compararTipoEvento = (
    a: number | string | null,
    b: number | string | null,
  ): boolean => {
    if (a == null || b == null) return a === b;
    return Number(a) === Number(b);
  };

  readonly displayEmpleado = (p: PersonaResumen | string | null): string => {
    if (!p || typeof p === 'string') return p ?? '';
    return `${p.nombreCompleto} — DNI ${p.dni ?? ''}`;
  };

  constructor() {
    this.escucharBusquedaEmpleado();

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

  onArchivoSeleccionado(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.archivoSeleccionado.set(input.files?.[0] ?? null);
  }

  limpiarArchivo(): void {
    this.archivoSeleccionado.set(null);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    if (!this.puedeRegistrar()) {
      this.form.markAllAsTouched();
      return;
    }
    const tipo = this.tipoSeleccionado();
    if (!tipo) return;
    const empleadoId = this.resolverEmpleadoId();
    if (empleadoId == null) {
      this.snack.open('Seleccione el empleado al que registrará el evento.', 'Cerrar', {
        duration: 5000,
      });
      return;
    }
    const archivo = this.archivoSeleccionado();
    if (!this.modoEdicion() && tipo.requiereAdjunto === 'S' && !archivo) {
      this.snack.open(
        'Este tipo de evento requiere un sustento documental adjunto.',
        'Cerrar',
        { duration: 6000 },
      );
      return;
    }

    this.submitting.set(true);
    const legajoUpload$: Observable<LegajoDocumentoResponse | null> = archivo
      ? this.legajoApi.upload(archivo, empleadoId, this.resolverCategoriaParaTipo(tipo), {
          origen: 'EVENTO',
          observacion: `Sustento de evento ${tipo.codigo}`,
        })
      : of(null);

    legajoUpload$
      .pipe(
        switchMap((doc) => {
          const dto = this.construirRequest(
            empleadoId,
            tipo,
            doc?.id ?? this.data.evento?.sustentoLegajoDocId ?? null,
          );
          return this.modoEdicion()
            ? this.api.actualizar(this.data.evento!.id, dto)
            : this.api.crear(dto);
        }),
        takeUntilDestroyed(this.destroyRef),
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

  onEmpleadoSeleccionado(p: PersonaResumen): void {
    this.empleadoSeleccionado.set(p);
  }

  private resolverEmpleadoId(): number | null {
    if (this.modoEdicion()) {
      return this.data.empleadoId;
    }
    return this.empleadoSeleccionado()?.empleadoId ?? null;
  }

  private escucharBusquedaEmpleado(): void {
    if (this.modoEdicion()) return;
    this.empleadoCtrl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          const texto = q.trim();
          if (texto.length < 2) {
            this.buscandoEmpleados.set(false);
            return of([] as readonly PersonaResumen[]);
          }
          this.buscandoEmpleados.set(true);
          return this.personaApi.listarPaginado(0, 15, texto).pipe(
            map((page) => page.content.filter((p) => p.empleadoId != null)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (opts) => {
          this.empleadoOpciones.set(opts);
          this.buscandoEmpleados.set(false);
        },
        error: () => this.buscandoEmpleados.set(false),
      });
  }

  private construirRequest(
    empleadoId: number,
    tipo: TipoEvento,
    sustentoId: number | null,
  ): EventoPeriodoRequest {
    const raw = this.form.getRawValue();
    return {
      empleadoId,
      tipoEventoId: tipo.id,
      fechaInicio: this.toIso(raw.fechaInicio),
      fechaFin: this.toIso(raw.fechaFin),
      diasAfectos: raw.diasAfectos ?? null,
      sustentoLegajoDocId: sustentoId,
      observacion: raw.observacion || null,
    };
  }

  private resolverCategoriaParaTipo(tipo: TipoEvento): number {
    const codigo = tipo.codigo.toUpperCase();
    const buscar = (n: string) =>
      this.data.categoriasLegajo.find(
        (c) => c.nombre.toLowerCase() === n.toLowerCase(),
      );

    let cat: LegajoCategoria | undefined;
    if (codigo.startsWith('LICENCIA') || codigo === 'PATERNIDAD' || codigo === 'PERMISO_PERSONAL') {
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

  private toIso(value: Date | null): string {
    if (!value) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
