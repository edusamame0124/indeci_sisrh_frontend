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
import { MatRadioModule } from '@angular/material/radio';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { debounceTime, distinctUntilChanged, merge, of, startWith, switchMap, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { EventoPeriodoApiService } from '../../services/evento-periodo-api.service';
import { PersonaApiService } from '../../services/persona-api.service';
import { LegajoDocumentoApiService } from '../../services/legajo-documento-api.service';
import type { LegajoDocumentoResponse } from '../../models/legajo-documento.model';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type {
  EventoDistribucionMes,
  EventoPeriodoRequest,
  EventoPeriodoResponse,
  MaternidadPreview,
  TipoEvento,
} from '../../models/evento-periodo.model';
import type { LegajoCategoria } from '../../models/legajo-documento.model';
import type { PersonaResumen } from '../../models/persona-empleado.model';
import {
  calcularDistribucionMensual,
  calcularFechaFinMaternidad,
  construirPreviewMaternidad,
  formatearFechaEs,
  formatearPeriodo,
  normalizarDuracionLegal,
  type DuracionLegalMaternidad,
} from '../../utils/evento-periodo-maternidad.utils';

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
    MatRadioModule,
    MatTableModule,
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
  readonly previewing = signal(false);
  readonly archivoSeleccionado = signal<File | null>(null);
  readonly previewVisible = signal(false);
  readonly preview = signal<MaternidadPreview | null>(null);
  readonly distribucion = signal<readonly EventoDistribucionMes[]>([]);
  readonly empleadoSeleccionado = signal<PersonaResumen | null>(null);
  readonly empleadoOpciones = signal<readonly PersonaResumen[]>([]);
  readonly buscandoEmpleados = signal(false);
  readonly empleadoCtrl = this.fb.nonNullable.control('');
  /** Resumen calculado — signal explícito para refrescar inputs readonly (OnPush). */
  readonly maternidadResumen = signal<{
    fechaFinTexto: string;
    totalDias: number | null;
  }>({ fechaFinTexto: '', totalDias: null });

  readonly distribucionColumns = [
    'periodo',
    'desde',
    'hasta',
    'dias',
    'afectaDias',
    'estado',
  ] as const;

  readonly form = this.fb.nonNullable.group({
    tipoEventoId: this.fb.nonNullable.control<number | null>(null, [Validators.required]),
    fechaInicio: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    fechaFin: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),
    diasAfectos: this.fb.nonNullable.control<number | null>(null),
    observacion: this.fb.nonNullable.control<string>(''),
    fechaProbableParto: this.fb.nonNullable.control<Date | null>(null),
    duracionLegal: this.fb.nonNullable.control<DuracionLegalMaternidad | null>(null),
    motivoExtension: this.fb.nonNullable.control<string | null>(null),
    difierePrenatalPostnatal: this.fb.nonNullable.control<string>('NO'),
    tipoDocumento: this.fb.nonNullable.control<string | null>(null),
    nroCitt: this.fb.nonNullable.control<string>(''),
    fechaEmisionDoc: this.fb.nonNullable.control<Date | null>(null),
  });

  /** Puente FormControl → signal para que OnPush detecte cambio de tipo. */
  private readonly tipoEventoIdSig = toSignal(
    this.form.controls.tipoEventoId.valueChanges.pipe(
      startWith(this.form.controls.tipoEventoId.value),
    ),
    { initialValue: this.form.controls.tipoEventoId.value },
  );

  /** Invalida computeds que leen FormControl (no son signals). */
  private readonly formSync = toSignal(
    merge(this.form.valueChanges, this.form.statusChanges).pipe(startWith(null)),
    { initialValue: null },
  );

  readonly tipoSeleccionado = computed<TipoEvento | null>(() => {
    const id = this.tipoEventoIdSig();
    if (id == null) return null;
    const numericId = typeof id === 'string' ? Number(id) : id;
    if (Number.isNaN(numericId)) return null;
    return this.data.tipos.find((t) => t.id === numericId) ?? null;
  });

  readonly esMaternidad = computed(
    () => this.tipoSeleccionado()?.codigo === 'MATERNIDAD',
  );

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

  readonly puedeRegistrar = computed(() => {
    this.formSync();
    if (this.submitting()) return false;
    if (!this.modoEdicion() && !this.empleadoSeleccionado()?.empleadoId) return false;
    if (!this.form.controls.tipoEventoId.value) return false;
    if (this.esMaternidad()) {
      if (this.form.invalid) return false;
      if (this.distribucion().length === 0) return false;
      if (!this.modoEdicion() && !this.archivoSeleccionado()) return false;
      return true;
    }
    return !this.form.invalid;
  });

  readonly modoEdicion = computed(() => this.data.evento != null);
  readonly titulo = computed(() =>
    this.modoEdicion() ? 'Editar evento del período' : 'Registrar evento del período',
  );

  readonly formatearPeriodo = formatearPeriodo;
  readonly formatearFechaEs = formatearFechaEs;

  /** Evita mismatch string/number en mat-select (id del catálogo). */
  readonly compararTipoEvento = (
    a: number | string | null,
    b: number | string | null,
  ): boolean => {
    if (a == null || b == null) return a === b;
    return Number(a) === Number(b);
  };

  private modoMaternidadAnterior = false;

  readonly displayEmpleado = (p: PersonaResumen | string | null): string => {
    if (!p || typeof p === 'string') return p ?? '';
    return `${p.nombreCompleto} — DNI ${p.dni ?? ''}`;
  };

  constructor() {
    this.escucharBusquedaEmpleado();
    this.escucharCambioTipo();
    this.escucharCalculoMaternidad();

    const e = this.data.evento;
    if (e) {
      this.form.patchValue({
        tipoEventoId: e.tipoEventoId,
        fechaInicio: e.fechaInicio ? new Date(e.fechaInicio) : null,
        fechaFin: e.fechaFin ? new Date(e.fechaFin) : null,
        diasAfectos: e.diasAfectos ?? null,
        observacion: e.observacion ?? '',
        fechaProbableParto: e.fechaProbableParto ? new Date(e.fechaProbableParto) : null,
        duracionLegal: (e.duracionLegal as DuracionLegalMaternidad | null) ?? null,
        motivoExtension: e.motivoExtension ?? null,
        difierePrenatalPostnatal: e.difierePrenatalPostnatal ?? 'NO',
        tipoDocumento: e.tipoDocumento ?? null,
        nroCitt: e.nroCitt ?? '',
        fechaEmisionDoc: e.fechaEmisionDoc ? new Date(e.fechaEmisionDoc) : null,
      });
      if (e.distribucionMensual?.length) {
        this.distribucion.set(e.distribucionMensual);
      }
      if (e.tipoEventoCodigo === 'MATERNIDAD') {
        this.activarModoMaternidad(true);
        this.recalcularMaternidad();
      }
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

  /** Dispara recálculo al elegir fecha en el datepicker (valueChanges a veces no alcanza). */
  onFechaDescansoChange(): void {
    this.recalcularMaternidad();
  }

  previsualizarImpacto(): void {
    if (!this.esMaternidad()) return;
    const inicio = this.form.controls.fechaInicio.value;
    const duracion = this.form.controls.duracionLegal.value;
    if (!inicio || !duracion) {
      this.snack.open('Complete fecha de inicio y duración legal.', 'Cerrar', { duration: 5000 });
      return;
    }
    this.previewing.set(true);
    const local = construirPreviewMaternidad(inicio, duracion);
    this.preview.set(local);
    this.previewVisible.set(true);
    this.previewing.set(false);
  }

  guardar(): void {
    if (!this.puedeRegistrar()) {
      this.form.markAllAsTouched();
      if (this.esMaternidad() && !this.archivoSeleccionado() && !this.modoEdicion()) {
        this.snack.open(
          'Adjunte el CITT, certificado médico o documento sustentatorio para registrar el subsidio por maternidad.',
          'Cerrar',
          { duration: 7000 },
        );
      }
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
    const base: EventoPeriodoRequest = {
      empleadoId,
      tipoEventoId: tipo.id,
      fechaInicio: this.toIso(raw.fechaInicio),
      fechaFin: this.toIso(raw.fechaFin),
      sustentoLegajoDocId: sustentoId,
      observacion: raw.observacion || null,
    };

    if (this.esMaternidad()) {
      const inicio = raw.fechaInicio;
      const duracion = normalizarDuracionLegal(raw.duracionLegal);
      const fin = inicio && duracion
        ? calcularFechaFinMaternidad(inicio, duracion)
        : raw.fechaFin;
      return {
        ...base,
        fechaFin: this.toIso(fin),
        diasAfectos: raw.duracionLegal,
        duracionLegal: raw.duracionLegal,
        motivoExtension: raw.duracionLegal === 128 ? raw.motivoExtension : null,
        fechaProbableParto: this.toIso(raw.fechaProbableParto),
        difierePrenatalPostnatal: raw.difierePrenatalPostnatal,
        tipoDocumento: raw.tipoDocumento,
        nroCitt: raw.nroCitt.trim(),
        fechaEmisionDoc: this.toIso(raw.fechaEmisionDoc),
        distribucionMensual: [...this.distribucion()],
      };
    }

    return {
      ...base,
      diasAfectos: this.form.controls.diasAfectos.value ?? null,
    };
  }

  private escucharCambioTipo(): void {
    this.form.controls.tipoEventoId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const esMat = this.esMaternidad();
        if (this.modoMaternidadAnterior && !esMat) {
          this.limpiarCamposMaternidad();
          this.snack.open(
            'Se limpiaron los datos específicos de maternidad porque el tipo de evento seleccionado cambió.',
            'Cerrar',
            { duration: 6000 },
          );
        }
        if (esMat) {
          this.activarModoMaternidad(true);
        } else {
          this.desactivarModoMaternidad(true);
        }
        this.modoMaternidadAnterior = esMat;
      });
  }

  private escucharCalculoMaternidad(): void {
    this.form.controls.fechaInicio.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalcularMaternidad());
    this.form.controls.duracionLegal.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const duracion = this.form.controls.duracionLegal.value;
        const motivo = this.form.controls.motivoExtension;
        if (duracion === 128) {
          motivo.setValidators([Validators.required]);
        } else {
          motivo.clearValidators();
          motivo.setValue(null);
        }
        motivo.updateValueAndValidity();
        this.recalcularMaternidad();
      });
  }

  private recalcularMaternidad(): void {
    if (!this.esMaternidad()) {
      this.maternidadResumen.set({ fechaFinTexto: '', totalDias: null });
      return;
    }
    const inicio = this.form.controls.fechaInicio.value;
    const duracion = normalizarDuracionLegal(this.form.controls.duracionLegal.value);
    if (!inicio || !duracion) {
      this.maternidadResumen.set({ fechaFinTexto: '', totalDias: duracion });
      return;
    }
    const fin = calcularFechaFinMaternidad(inicio, duracion);
    this.form.controls.fechaFin.setValue(fin, { emitEvent: false });
    this.maternidadResumen.set({
      fechaFinTexto: formatearFechaEs(this.toIso(fin)),
      totalDias: duracion,
    });
    const tramos = calcularDistribucionMensual(inicio, fin);
    this.distribucion.set(tramos);
    this.preview.set(construirPreviewMaternidad(inicio, duracion));
  }

  private activarModoMaternidad(restaurarGenerales: boolean): void {
    this.form.controls.fechaFin.disable({ emitEvent: false });
    this.form.controls.diasAfectos.clearValidators();
    this.form.controls.diasAfectos.setValue(null, { emitEvent: false });

    this.form.controls.fechaProbableParto.setValidators([Validators.required]);
    this.form.controls.duracionLegal.setValidators([Validators.required]);
    this.form.controls.difierePrenatalPostnatal.setValidators([Validators.required]);
    this.form.controls.tipoDocumento.setValidators([Validators.required]);
    this.form.controls.nroCitt.setValidators([Validators.required]);
    this.form.controls.fechaEmisionDoc.setValidators([Validators.required]);

    const duracionActual = normalizarDuracionLegal(this.form.controls.duracionLegal.value);
    if (!duracionActual) {
      this.form.controls.duracionLegal.setValue(98 as DuracionLegalMaternidad);
    }
    this.form.updateValueAndValidity();
    this.recalcularMaternidad();
  }

  private desactivarModoMaternidad(restaurarGenerales: boolean): void {
    this.form.controls.fechaFin.enable({ emitEvent: false });
    this.form.controls.fechaFin.setValidators([Validators.required]);
    this.form.controls.diasAfectos.clearValidators();

    this.limpiarValidatorsMaternidad();
    this.distribucion.set([]);
    this.preview.set(null);
    this.previewVisible.set(false);
    this.maternidadResumen.set({ fechaFinTexto: '', totalDias: null });
    this.form.updateValueAndValidity();
  }

  private limpiarCamposMaternidad(): void {
    this.form.patchValue({
      fechaProbableParto: null,
      duracionLegal: null,
      motivoExtension: null,
      difierePrenatalPostnatal: 'NO',
      tipoDocumento: null,
      nroCitt: '',
      fechaEmisionDoc: null,
    });
    this.limpiarValidatorsMaternidad();
    this.distribucion.set([]);
    this.preview.set(null);
    this.previewVisible.set(false);
    this.maternidadResumen.set({ fechaFinTexto: '', totalDias: null });
  }

  private limpiarValidatorsMaternidad(): void {
    const campos = [
      'fechaProbableParto',
      'duracionLegal',
      'motivoExtension',
      'difierePrenatalPostnatal',
      'tipoDocumento',
      'nroCitt',
      'fechaEmisionDoc',
    ] as const;
    for (const c of campos) {
      this.form.controls[c].clearValidators();
      this.form.controls[c].updateValueAndValidity({ emitEvent: false });
    }
  }

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

  private toIso(value: Date | null): string {
    if (!value) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
