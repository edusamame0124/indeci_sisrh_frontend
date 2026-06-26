import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, merge } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmpleadoPlanillaApiService } from '../../services/empleado-planilla-api.service';
import { CatalogoApiService } from '../../services/catalogo-api.service';
import type { RegimenLaboral } from '../../../catalogos/models/regimen-laboral.model';
import type { TipoContrato } from '../../../catalogos/models/tipo-contrato.model';
import type { CondicionLaboral } from '../../../catalogos/models/condicion-laboral.model';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { EmpleadoFlowWarningBannerComponent } from '../../components/empleado-flow-warning-banner/empleado-flow-warning-banner.component';
import { EmpleadoFlowService } from '../../services/empleado-flow.service';
import { EmpleadoFlowBackendSyncService } from '../../services/empleado-flow-backend-sync.service';
import { padAirhspCode } from '../../utils/pad-airhsp-code';
import type { IncrementosDsResponse } from '../../models/incrementos-ds.model';
import { IncrementosDsPanelComponent } from './components/incrementos-ds-panel/incrementos-ds-panel.component';
import { ResumenRemuneracionCardComponent } from './components/resumen-remuneracion-card/resumen-remuneracion-card.component';
import { TipoPersonaMefApiService } from '../../../planilla/services/tipo-persona-mef-api.service';
import type { TipoPersonaMef } from '../../../planilla/models/tipo-persona-mef.model';

const MONTO_INT_DIGITS = 5;
const MONTO_MAX = 99999.99;
const AIRHSP_PATTERN = /^[0-9]{6}$/;

@Component({
  selector: 'app-empleado-planilla-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    EmpleadoFlowWarningBannerComponent,
    IncrementosDsPanelComponent,
    ResumenRemuneracionCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleado-planilla-form-page.component.html',
  styleUrl: './empleado-planilla-form-page.component.scss',
})
export class EmpleadoPlanillaFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly personaApi = inject(PersonaApiService);
  private readonly planillaApi = inject(EmpleadoPlanillaApiService);
  private readonly catalogoApi = inject(CatalogoApiService);
  private readonly tipoPersonaMefApi = inject(TipoPersonaMefApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly notif = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);
  private readonly empleadoFlow = inject(EmpleadoFlowService);
  private readonly flowBackendSync = inject(EmpleadoFlowBackendSyncService);

  readonly personaId = signal(0);
  readonly personaLabel = signal('Persona');
  readonly empleadoId = signal(0);
  readonly planillaId = signal<number | null>(null);
  readonly isEdit = signal(false);
  readonly pageLoading = signal(true);
  readonly saving = signal(false);
  readonly incrementosDs = signal<IncrementosDsResponse | null>(null);
  readonly incrementosLoading = signal(false);

  readonly regimenes = signal<readonly RegimenLaboral[]>([]);
  readonly tiposContrato = signal<readonly TipoContrato[]>([]);
  readonly condiciones = signal<readonly CondicionLaboral[]>([]);
  readonly tiposPersonaMef = signal<readonly TipoPersonaMef[]>([]);

  readonly form = this.fb.group({
    regimenLaboralId: this.fb.control<number | null>(null, [Validators.required]),
    tipoContratoId: this.fb.control<number | null>(null),
    condicionLaboralId: this.fb.control<number | null>(null),
    montoContratado: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(MONTO_MAX),
    ]),
    sueldoBasico: this.fb.control<number | null>({ value: null, disabled: true }, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(MONTO_MAX),
    ]),
    numHijos: this.fb.control<number | null>(null, [Validators.min(0)]),
    tipoPersonaMefId: this.fb.control<number | null>(null),
    registroPlazaAirhsp: this.fb.control<string>(''),
  });

  readonly tieneHijos = computed(() => {
    const n = this.numHijosSignal();
    return typeof n === 'number' && n > 0;
  });

  readonly totalIncrementos = computed(() => this.incrementosDs()?.totalIncrementos ?? 0);

  readonly muestraAsigFamiliar = computed(() => {
    if (!this.tieneHijos()) {
      return false;
    }
    const regimenId = this.regimenLaboralIdSignal();
    const condicionId = this.condicionLaboralIdSignal();
    const regimen = this.regimenes().find((r) => r.id === regimenId);
    const condicion = this.condiciones().find((c) => c.id === condicionId);
    const regCod = regimen?.codigo ?? '';
    const condCod = condicion?.codigo ?? '';
    if (regCod === '276' || regCod === '30057') {
      return false;
    }
    return regCod === '728' || regCod === '1057' || condCod === 'CAS';
  });

  private readonly numHijosSignal = signal<number | null>(null);
  private readonly regimenLaboralIdSignal = signal<number | null>(null);
  private readonly condicionLaboralIdSignal = signal<number | null>(null);

  constructor() {
    this.form.controls.numHijos.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((n) => this.numHijosSignal.set(n));

    this.form.controls.regimenLaboralId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.regimenLaboralIdSignal.set(id));

    this.form.controls.condicionLaboralId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.condicionLaboralIdSignal.set(id));

    merge(
      this.form.controls.regimenLaboralId.valueChanges,
      this.form.controls.condicionLaboralId.valueChanges,
    )
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.recalcularIncrementos());
  }

  ngOnInit(): void {
    this.cargarCatalogos();

    const mode = this.route.snapshot.data['mode'] === 'edit' ? 'edit' : 'create';
    this.isEdit.set(mode === 'edit');

    const pidStr = this.route.snapshot.paramMap.get('personaId');
    const pid = pidStr ? Number(pidStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/empleados/planilla']);
      return;
    }
    this.personaId.set(pid);

    if (mode === 'edit') {
      const plStr = this.route.snapshot.paramMap.get('planillaId');
      const plId = plStr ? Number(plStr) : NaN;
      if (!Number.isFinite(plId) || plId < 1) {
        void this.router.navigate(['/empleados/planilla/personas', pid]);
        return;
      }
      this.planillaId.set(plId);
    }

    this.personaApi
      .obtenerPorId(pid)
      .pipe(
        switchMap((p) => {
          this.personaLabel.set(p.nombreCompleto);
          const eid = p.empleadoId != null && p.empleadoId > 0 ? p.empleadoId : 0;
          if (eid < 1) {
            this.snack.open('No hay empleado vinculado a esta persona.', 'Cerrar', { duration: 5000 });
            void this.router.navigate(['/empleados/planilla/personas', pid]);
            return EMPTY;
          }
          this.empleadoId.set(eid);
          this.empleadoFlow.hydrateFromPersona(p);
          return this.flowBackendSync.syncCompletedStepsFromBackend(eid);
        }),
      )
      .subscribe({
        next: () => {
          if (mode === 'edit') {
            this.patchFromList(this.empleadoId(), this.planillaId()!);
          } else {
            this.pageLoading.set(false);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.onHttpFail(err, ['/empleados/planilla']);
        },
      });
  }

  private cargarCatalogos(): void {
    this.catalogoApi.listarRegimenesLaborales().subscribe({
      next: (list) => this.regimenes.set(list),
      error: () => this.regimenes.set([]),
    });
    this.catalogoApi.listarTiposContrato().subscribe({
      next: (list) => this.tiposContrato.set(list),
      error: () => this.tiposContrato.set([]),
    });
    this.catalogoApi.listarCondicionesLaborales().subscribe({
      next: (list) => this.condiciones.set(list),
      error: () => this.condiciones.set([]),
    });
    this.tipoPersonaMefApi.listarActivos().subscribe({
      next: (list) => this.tiposPersonaMef.set(list),
      error: () => this.tiposPersonaMef.set([]),
    });
  }

  private patchFromList(empleadoId: number, targetId: number): void {
    this.planillaApi.listar(empleadoId).subscribe({
      next: (list) => {
        const row = list.find((r) => r.id === targetId);
        if (!row) {
          this.snack.open('No se encontró el registro de planilla solicitado.', 'Cerrar', { duration: 5000 });
          void this.router.navigate(['/empleados/planilla']);
          return;
        }
        const montoContratado = row.montoContrato ?? row.sueldoBasico;
        this.form.patchValue({
          regimenLaboralId: row.regimenLaboralId,
          tipoContratoId: row.tipoContratoId,
          condicionLaboralId: row.condicionLaboralId,
          montoContratado,
          sueldoBasico: row.sueldoBasico,
          numHijos: row.numHijos,
          tipoPersonaMefId: (row as any).tipoPersonaMefId ?? null,
          registroPlazaAirhsp: (row as any).registroPlazaAirhsp ?? '',
        });
        this.regimenLaboralIdSignal.set(row.regimenLaboralId);
        this.condicionLaboralIdSignal.set(row.condicionLaboralId);
        this.numHijosSignal.set(row.numHijos);
        this.pageLoading.set(false);
        this.recalcularIncrementos();
      },
      error: (err: HttpErrorResponse) =>
        this.onHttpFail(err, ['/empleados/planilla/personas', this.personaId()]),
    });
  }

  onCodigoAirhspBlur(): void {
    // Deprecated
  }

  onMontoContratadoInput(event: Event): void {
    this.limitMontoInput(event, this.form.controls.montoContratado);
  }

  onMontoContratadoBlur(): void {
    this.recalcularIncrementos();
  }

  recalcularIncrementos(): void {
    const regimenId = this.form.controls.regimenLaboralId.value;
    const monto = this.form.controls.montoContratado.value;
    if (regimenId == null || monto == null || monto < 0.01) {
      this.incrementosDs.set(null);
      return;
    }

    this.incrementosLoading.set(true);
    this.planillaApi
      .calcularIncrementosDs({
        regimenLaboralId: regimenId,
        condicionLaboralId: this.form.controls.condicionLaboralId.value,
        montoContratado: monto,
      })
      .subscribe({
        next: (resp) => {
          this.incrementosDs.set(resp);
          this.form.controls.sueldoBasico.setValue(resp.remuneracionMensual);
          this.incrementosLoading.set(false);
        },
        error: () => {
          this.incrementosDs.set(null);
          this.incrementosLoading.set(false);
        },
      });
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const empId = this.empleadoId();
    if (v.sueldoBasico == null || v.montoContratado == null || empId < 1) {
      return;
    }

    const numHijos = v.numHijos ?? 0;
    if (v.regimenLaboralId == null) {
      return;
    }

    const body = {
      empleadoId: empId,
      codigoAirhsp: '000000',
      montoContrato: v.montoContratado,
      sueldoBasico: v.sueldoBasico,
      tieneAsignacionFamiliar: numHijos > 0 ? 1 : 0,
      numHijos: v.numHijos ?? undefined,
      regimenLaboralId: v.regimenLaboralId,
      tipoContratoId: v.tipoContratoId ?? null,
      condicionLaboralId: v.condicionLaboralId ?? null,
      tipoPersonaMefId: v.tipoPersonaMefId ?? null,
      registroPlazaAirhsp: v.registroPlazaAirhsp ?? '',
    };

    this.saving.set(true);
    if (this.isEdit()) {
      const id = this.planillaId();
      if (id == null) {
        this.saving.set(false);
        return;
      }
      this.planillaApi.actualizar(id, body).subscribe({
        next: () => this.onSaved('Planilla actualizada.'),
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
      return;
    }
    this.planillaApi.guardar(body).subscribe({
      next: () => this.onSaved('Planilla registrada.'),
      error: (err: HttpErrorResponse) => this.onSaveErr(err),
    });
  }

  private limitMontoInput(
    event: Event,
    control: typeof this.form.controls.montoContratado,
  ): void {
    const input = event.target as HTMLInputElement | null;
    if (!input || input.value === '') {
      return;
    }
    const raw = input.value;
    const [intPart = '', decPart] = raw.split('.');
    const cappedInt = intPart.slice(0, MONTO_INT_DIGITS);
    const cappedDec = decPart != null ? decPart.slice(0, 2) : undefined;
    const cleaned = cappedDec !== undefined ? `${cappedInt}.${cappedDec}` : cappedInt;
    if (raw !== cleaned) {
      const num = cleaned === '' || cleaned === '.' ? null : Number(cleaned);
      control.setValue(Number.isFinite(num as number) ? (num as number) : null);
    }
  }

  private onSaved(msg: string): void {
    this.saving.set(false);
    this.notif.exito(msg);
    void this.router.navigate(['/empleados/planilla/personas', this.personaId()]);
  }

  private onSaveErr(err: HttpErrorResponse): void {
    this.saving.set(false);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }

  private onHttpFail(err: HttpErrorResponse, segments: readonly (string | number)[]): void {
    this.pageLoading.set(false);
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
    void this.router.navigate([...segments]);
  }
}
