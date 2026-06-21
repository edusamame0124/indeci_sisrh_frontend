import {

  ChangeDetectionStrategy,

  Component,

  computed,

  DestroyRef,

  effect,

  inject,

  input,

  output,

  signal,

} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CommonModule } from '@angular/common';

import { HttpErrorResponse } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MatSnackBar } from '@angular/material/snack-bar';

import { MatTabsModule } from '@angular/material/tabs';

import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';

import { AuthService } from '../../../../../../core/services/auth.service';

import { ErrorMessageService } from '../../../../../../core/services/error-message.service';

import { isErrorResponse } from '../../../../../../core/models/error-response.model';

import { SubsidioApiService } from '../../services/subsidio-api.service';

import type {

  SubsidioCasoResponse,

  SubsidioLiquidacionResponse,

  SubsidioValidacion,

} from '../../models/subsidio.models';

import {

  labelEstadoCaso,

  labelTipoCaso,

  tienePermisoSubsidio,

} from '../../utils/subsidio-calculo-display.utils';

import {

  accionPrioritariaFlujo,

  calcularCompletitudFlujo,

  montoTotalPlanilla,

  mostrarMontoPlanilla,

  requisitosCriticosBanner,

  type SubsidioFlujoPasoIndex,

} from '../../utils/subsidio-flujo.utils';

import { TabResumenComponent } from './tab-resumen/tab-resumen.component';

import { TabCittDocumentosComponent } from './tab-citt-documentos/tab-citt-documentos.component';

import { TabBaseHistoricaComponent } from './tab-base-historica/tab-base-historica.component';

import { TabCalculoExplicadoComponent } from './tab-calculo-explicado/tab-calculo-explicado.component';

import { TabAplicacionPlanillaComponent } from './tab-aplicacion-planilla/tab-aplicacion-planilla.component';
import { TabHistorialComponent } from './tab-historial/tab-historial.component';

import { SubsidioFlujoStepperComponent } from './subsidio-flujo-stepper/subsidio-flujo-stepper.component';

import { SubsidioRequisitosBannerComponent } from './subsidio-requisitos-banner/subsidio-requisitos-banner.component';

import { PasoTramosDiasComponent } from './paso-tramos-dias/paso-tramos-dias.component';

import { PasoInformacionComplementariaComponent } from './paso-informacion-complementaria/paso-informacion-complementaria.component';



const PASO_ETIQUETAS = [

  'Paso 1 — Datos del caso y descanso',

  'Paso 2 — Tramos y días',

  'Paso 3 — Cálculo y validación',

  'Paso 4 — Aplicación a planilla',

  'Información complementaria',

] as const;



@Component({

  selector: 'app-subsidio-detalle-caso',

  standalone: true,

  imports: [

    CommonModule,

    MatButtonModule,

    MatChipsModule,

    MatCardModule,

    MatIconModule,

    MatProgressSpinnerModule,

    MatTabsModule,

    SubsidioFlujoStepperComponent,

    SubsidioRequisitosBannerComponent,

    TabResumenComponent,

    TabCittDocumentosComponent,

    TabBaseHistoricaComponent,

    TabCalculoExplicadoComponent,

    TabAplicacionPlanillaComponent,

    TabHistorialComponent,

    PasoTramosDiasComponent,

    PasoInformacionComplementariaComponent,

  ],

  changeDetection: ChangeDetectionStrategy.OnPush,

  templateUrl: './detalle-caso.component.html',

  styleUrl: './detalle-caso.component.css',

})

export class DetalleCasoComponent {

  readonly casoId = input.required<number>();

  readonly volver = output<void>();

  readonly casoActualizado = output<SubsidioCasoResponse>();



  private readonly api = inject(SubsidioApiService);

  private readonly auth = inject(AuthService);

  private readonly snack = inject(MatSnackBar);

  private readonly errors = inject(ErrorMessageService);

  private readonly destroyRef = inject(DestroyRef);



  readonly loading = signal(true);

  readonly caso = signal<SubsidioCasoResponse | null>(null);

  readonly tabIndex = signal<SubsidioFlujoPasoIndex>(0);

  readonly validaciones = signal<readonly SubsidioValidacion[]>([]);

  readonly tieneBase = signal(false);

  readonly liquidacionRef = signal<SubsidioLiquidacionResponse | null>(null);



  readonly labelTipo = labelTipoCaso;

  readonly labelEstado = labelEstadoCaso;



  readonly puedeValidar = computed(() =>

    tienePermisoSubsidio(this.auth.permisos(), 'SUB_VALIDATE'),

  );



  readonly chipRegla = computed(() => {

    const c = this.caso();

    return c?.reglaVigenciaId != null ? `Regla vigente v${c.reglaVigenciaId}` : 'Regla pendiente';

  });



  readonly chipModo = computed(() => {

    const modo = this.caso()?.modoCalculo;

    return modo === 'SIMULACION' ? 'Simulación' : 'Cálculo oficial';

  });



  readonly completitud = computed(() =>

    calcularCompletitudFlujo(this.caso(), this.tieneBase(), this.liquidacionRef()),

  );



  readonly pasoActualLabel = computed(() => PASO_ETIQUETAS[this.tabIndex()]);



  readonly bannerAccion = computed(() =>

    accionPrioritariaFlujo(

      this.tabIndex(),

      this.caso(),

      this.tieneBase(),

      this.liquidacionRef(),

    ),

  );



  readonly bannerRequisitos = computed(() =>

    requisitosCriticosBanner(

      this.validaciones(),

      this.caso(),

      this.tieneBase(),

      this.liquidacionRef(),

    ),

  );



  readonly mostrarMontoPlanilla = computed(() =>

    mostrarMontoPlanilla(this.caso(), this.liquidacionRef()),

  );



  readonly montoPlanilla = computed(() => montoTotalPlanilla(this.liquidacionRef()));



  readonly motivosBloqueoPlanilla = computed(() =>

    this.validaciones()

      .filter((v) => v.severidad === 'BLOQUEO')

      .slice(0, 3)

      .map((v) => v.mensaje),

  );



  constructor() {

    effect(() => {

      const id = this.casoId();

      this.tabIndex.set(0);

      this.cargarCaso(id);

      this.cargarValidaciones(id);

    });



    effect(() => {

      const c = this.caso();

      if (!c) return;

      this.cargarBase(c.id);

      this.cargarLiquidacionReferencia(c);

    });

  }



  recargar(): void {

    const id = this.casoId();

    this.cargarCaso(id);

    this.cargarValidaciones(id);

  }



  onTabChange(index: number): void {

    const clamped = Math.min(Math.max(index, 0), 4) as SubsidioFlujoPasoIndex;

    this.tabIndex.set(clamped);

  }



  onBannerAccion(): void {

    const accion = this.bannerAccion();

    this.tabIndex.set(accion.pasoDestino);



    if (accion.label === 'Enviar a validación') {

      this.enviarValidacion();

    }

  }



  onCasoRefrescado(caso: SubsidioCasoResponse): void {

    this.caso.set(caso);

    this.casoActualizado.emit(caso);

    this.cargarValidaciones(caso.id);

    this.cargarBase(caso.id);

    this.cargarLiquidacionReferencia(caso);

  }



  onBaseCargada(tiene: boolean): void {

    this.tieneBase.set(tiene);

  }



  onLiquidacionCargada(liq: SubsidioLiquidacionResponse | null): void {

    this.liquidacionRef.set(liq);

  }



  enviarValidacion(): void {

    const id = this.casoId();

    this.api.cambiarEstado(id, 'PENDIENTE_VALIDACION').subscribe({

      next: (res) => {

        this.caso.set(res);

        this.snack.open('Caso enviado a validación', 'Cerrar', { duration: 4000 });

        this.cargarValidaciones(id);

      },

      error: (err) => this.onHttpError(err),

    });

  }



  private cargarCaso(id: number): void {

    this.loading.set(true);

    this.api

      .obtenerCaso(id)

      .pipe(takeUntilDestroyed(this.destroyRef))

      .subscribe({

        next: (res) => {

          this.caso.set(res);

          this.loading.set(false);

          this.tabIndex.set(0);

        },

        error: (err: HttpErrorResponse) => {

          this.loading.set(false);

          this.onHttpError(err);

        },

      });

  }



  private cargarValidaciones(casoId: number): void {

    this.api

      .validaciones(casoId)

      .pipe(takeUntilDestroyed(this.destroyRef))

      .subscribe({

        next: (rows) => this.validaciones.set(rows),

        error: () => this.validaciones.set([]),

      });

  }



  private cargarBase(casoId: number): void {

    this.api

      .obtenerBase(casoId)

      .pipe(takeUntilDestroyed(this.destroyRef))

      .subscribe({

        next: () => this.tieneBase.set(true),

        error: (err: HttpErrorResponse) => {

          if (err.status === 404) this.tieneBase.set(false);

        },

      });

  }



  private cargarLiquidacionReferencia(caso: SubsidioCasoResponse): void {

    const tramos = caso.tramos ?? [];

    if (tramos.length === 0) {

      this.liquidacionRef.set(null);

      return;

    }

    const tramoId = tramos[0].id;

    this.api

      .historialLiquidaciones(tramoId)

      .pipe(takeUntilDestroyed(this.destroyRef))

      .subscribe({

        next: (hist) => {

          this.liquidacionRef.set(hist.length ? hist[hist.length - 1] : null);

        },

        error: () => this.liquidacionRef.set(null),

      });

  }



  private onHttpError(err: HttpErrorResponse): void {

    const body = err.error;

    const msg = isErrorResponse(body)

      ? this.errors.translate(body.mensaje)

      : this.errors.translate(null);

    this.snack.open(msg, 'Cerrar', { duration: 7000 });

  }

}


