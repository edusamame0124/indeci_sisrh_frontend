import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConceptoPlanillaApiService } from '../../services/concepto-planilla-api.service';
import type { ConceptoPlanillaRow } from '../../models/concepto-planilla.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PeriodoPlanillaApiService } from '../../services/periodo-planilla-api.service';
import { MovimientoPlanillaApiService } from '../../services/movimiento-planilla-api.service';
import { GeneradorPlanillaApiService } from '../../services/generador-planilla-api.service';
import { PlanillaLoteApiService } from '../../services/planilla-lote-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import type { RegimenLaboral } from '../../../catalogos/models/regimen-laboral.model';
import type { TipoContrato } from '../../../catalogos/models/tipo-contrato.model';
import type { CondicionLaboral } from '../../../catalogos/models/condicion-laboral.model';
import type { ModalidadCas } from '../../../catalogos/models/modalidad-cas.model';

import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';
import type { MovimientoPlanillaRow } from '../../models/movimiento-planilla.model';
import type { GeneracionMasivaResultado } from '../../models/generacion-masiva.model';

type FaseGeneracion = 'idle' | 'generando' | 'completado';

export interface CatalogoItem {
  codigo: string;
  etiqueta: string;
}

export const REGIMENES_CATALOGO: CatalogoItem[] = [
  { codigo: 'REG_276', etiqueta: 'D.L. 276 - Administrativa' },
  { codigo: 'REG_728', etiqueta: 'D.L. 728 - Privada' },
  { codigo: 'REG_CAS_IND', etiqueta: 'CAS Indeterminado' },
  { codigo: 'REG_CAS_TEMP', etiqueta: 'CAS Temporal / FEN' },
  { codigo: 'REG_SERVIR', etiqueta: 'Ley 30057 - SERVIR' },
  { codigo: 'REG_MOD_FORM', etiqueta: 'Modalidades Formativas' }
];

/**
 * Tarjeta del selector visual "Tipo de planilla" (Track A — solo presentación).
 * `codigo` es el valor que se envía en el payload `concepto` (sin cambios de contrato).
 */
export interface TipoPlanillaCard {
  codigo: string;
  etiqueta: string;
  grupo: 'PRINCIPAL' | 'BENEFICIO';
  icono: string;
  descripcion?: string;
  /** true = código aún no registrado en catálogo MEF; pendiente de Track B (backend). */
  placeholder?: boolean;
  /** Etiqueta corta arriba a la derecha (ej. 'REQ' para módulos dedicados). */
  badge?: string;
}

/**
 * Catálogo de tipos de planilla (9). Códigos con `placeholder: true`
 * (PLA_ADICIONAL_01/02/03, PLA_LBS) NO existen aún en el catálogo MEF: son de
 * presentación y hoy el motor los ignora (calcula haberes por régimen). Su
 * diferenciación real de cálculo/trazabilidad es Track B. Ver PLAN_SELECTOR_TIPO_PLANILLA.md.
 */
export const TIPOS_PLANILLA_CATALOGO: TipoPlanillaCard[] = [
  { codigo: 'PLA_HABERES', etiqueta: 'Planilla regular', grupo: 'PRINCIPAL', icono: 'calendar_month', descripcion: 'Planilla mensual ordinaria del personal.' },
  { codigo: 'PLA_ADICIONAL', etiqueta: 'Planilla Adicional', grupo: 'PRINCIPAL', icono: 'add_card', descripcion: 'Pago complementario o regularización.', placeholder: true },
  { codigo: 'PLA_CTS', etiqueta: 'CTS Trunca (Por Cese)', grupo: 'BENEFICIO', icono: 'business_center', descripcion: 'Liquidación exclusiva para personal con fecha de cese registrada en el periodo.', badge: 'REQ' },
  { codigo: 'PLA_AGUINALDO', etiqueta: 'Aguinaldo', grupo: 'BENEFICIO', icono: 'celebration' },
  { codigo: 'PLA_LBS', etiqueta: 'Liquidación de Beneficios Sociales', grupo: 'BENEFICIO', icono: 'badge', placeholder: true },
  { codigo: 'PLA_VAC_TRUN', etiqueta: 'Vacaciones truncas', grupo: 'BENEFICIO', icono: 'beach_access' },
  { codigo: 'PLA_DESC_SUBV', etiqueta: 'Descanso Subvencionado', grupo: 'BENEFICIO', icono: 'medical_services' },
];

export const COMPATIBILIDAD_PLANILLA_MAP: Record<string, string[]> = {
  // Matriz F0 CTS: habilitado SOLO en 276 y SERVIR (30057). 728 descartado; CAS 1057 sin CTS.
  '276': ['PLA_HABERES', 'PLA_ADICIONAL', 'PLA_CTS', 'PLA_AGUINALDO', 'PLA_LBS', 'PLA_VAC_TRUN'],
  '728': ['PLA_HABERES', 'PLA_ADICIONAL', 'PLA_AGUINALDO', 'PLA_LBS', 'PLA_VAC_TRUN'],
  '1057': ['PLA_HABERES', 'PLA_ADICIONAL', 'PLA_AGUINALDO', 'PLA_LBS', 'PLA_VAC_TRUN'],
  '30057': ['PLA_HABERES', 'PLA_ADICIONAL', 'PLA_CTS', 'PLA_AGUINALDO', 'PLA_LBS', 'PLA_VAC_TRUN'],
  'FORMATIVA': ['PLA_HABERES', 'PLA_ADICIONAL', 'PLA_DESC_SUBV'],
};

/**
 * Generación masiva de planilla (Spec 009 / T153, Spec 011 / C2).
 * - Selector de periodos ABIERTOS (la generación en CERRADO la rechaza backend).
 * - Confirmación previa con `ConfirmDialogComponent`.
 * - `MatProgressBar` indeterminado mientras corre + `aria-live` anuncio.
 * - Spec 011 / C2 (BKD-001): el backend devuelve `{ total, exitosos, fallidos[] }`;
 *   la pantalla muestra el conteo y la tabla de fallidos con su motivo.
 */
@Component({
  selector: 'app-generacion-masiva-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule,
    MatCheckboxModule,
    MatRadioModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './generacion-masiva-page.component.html',
  styleUrl: './generacion-masiva-page.component.css',
})
export class GeneracionMasivaPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly movimientoApi = inject(MovimientoPlanillaApiService);
  private readonly generadorApi = inject(GeneradorPlanillaApiService);
  private readonly planillaLoteApi = inject(PlanillaLoteApiService);
  private readonly catalogoApi = inject(CatalogoApiService);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly conceptoPlanillaApi = inject(ConceptoPlanillaApiService);

  readonly columns = [
    'empleadoDni', 
    'empleadoNombre', 
    'regimenPensionario', 
    'dias', 
    'totalIngresos', 
    'totalDescuentos', 
    'netoPagar', 
    'estado', 
    'acciones'
  ] as const;
  readonly columnsFallidos = ['empleadoId', 'razon'] as const;

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly conceptoSeleccionado = signal<string | null>(null);
  
  readonly regimenSeleccionado = signal<number | null>(null);
  readonly tipoContratoId = signal<number | null>(null);
  readonly condicionLaboralId = signal<number | null>(null);
  readonly modalidadCasId = signal<number | null>(null);

  readonly ordenBoletaSeleccionado = signal<string>('POR_DEPENDENCIA');
  
  readonly regimenes = signal<readonly RegimenLaboral[]>([]);
  readonly tiposContrato = signal<readonly TipoContrato[]>([]);
  readonly condicionesLaborales = signal<readonly CondicionLaboral[]>([]);
  readonly modalidadesCas = signal<readonly ModalidadCas[]>([]);

  readonly loading = signal(true);
  readonly fase = signal<FaseGeneracion>('idle');
  readonly movimientosPost = signal<readonly MovimientoPlanillaRow[]>([]);
  /** Resultado de la última generación masiva (Spec 011 / C2). */
  readonly resultado = signal<GeneracionMasivaResultado | null>(null);

  readonly periodosAbiertos = computed(() => this.periodos().filter((p) => p.estado === 'ABIERTO'));

  // --- Selector visual "Tipo de planilla" (Track A) ---
  readonly tiposPrincipales = TIPOS_PLANILLA_CATALOGO.filter((t) => t.grupo === 'PRINCIPAL');
  readonly tiposBeneficios = TIPOS_PLANILLA_CATALOGO.filter((t) => t.grupo === 'BENEFICIO');

  /** Códigos de tipo compatibles con el régimen elegido (vacío si no hay régimen). */
  readonly codigosPermitidos = computed<ReadonlySet<string>>(() => {
    const regimenId = this.regimenSeleccionado();
    if (!regimenId) return new Set<string>();
    const regimenCode = this.regimenes().find((r) => r.id === regimenId)?.codigo;
    if (!regimenCode) return new Set<string>();
    return new Set(COMPATIBILIDAD_PLANILLA_MAP[regimenCode] ?? []);
  });

  esTipoHabilitado(codigo: string): boolean {
    if (this.fase() === 'generando') return false;
    if (!this.codigosPermitidos().has(codigo)) return false;

    if (codigo === 'PLA_AGUINALDO') {
      const periodo = this.periodoSeleccionado();
      if (periodo && !periodo.endsWith('-07') && !periodo.endsWith('-12')) {
        return false;
      }
    }

    return true;
  }

  /** Motivo por el que una tarjeta está deshabilitada (null si está habilitada). */
  motivoTipoDeshabilitado(codigo: string): string | null {
    if (this.regimenSeleccionado() === null) return 'Seleccione un régimen laboral';
    if (!this.codigosPermitidos().has(codigo)) return 'No aplica al régimen seleccionado';

    if (codigo === 'PLA_AGUINALDO') {
      const periodo = this.periodoSeleccionado();
      if (periodo && !periodo.endsWith('-07') && !periodo.endsWith('-12')) {
        return 'El Aguinaldo solo se procesa en los periodos de Julio (-07) y Diciembre (-12)';
      }
    }

    return null;
  }

  private readonly router = inject(Router);

  seleccionarTipo(codigo: string): void {
    if (!this.esTipoHabilitado(codigo)) return;
    
    // Redirección inmediata a módulo dedicado (Requisito UX)
    if (codigo === 'PLA_AGUINALDO') {
      void this.router.navigate(['/planilla/aguinaldo'], {
        queryParams: {
          periodo: this.periodoSeleccionado(),
          regimen: this.regimenSeleccionado()
        }
      });
      return;
    }

    if (codigo === 'PLA_ADICIONAL') {
      void this.router.navigate(['/planilla/adicional'], {
        queryParams: {
          periodo: this.periodoSeleccionado(),
          regimen: this.regimenSeleccionado()
        }
      });
      return;
    }

    // Feature 016 — módulo dedicado de Liquidación de CTS Trunca.
    if (codigo === 'PLA_CTS') {
      const regId = this.regimenSeleccionado();
      const regCodigo = this.regimenes().find((r) => r.id === regId)?.codigo;
      void this.router.navigate(['/liquidaciones/cts'], {
        queryParams: {
          periodo: this.periodoSeleccionado(),
          regimenLaboralId: regId,
          regimen: regCodigo,
        },
      });
      return;
    }

    this.conceptoSeleccionado.set(codigo);
  }

  readonly isRegimen1057 = computed(() => {
    const id = this.regimenSeleccionado();
    return this.regimenes().find(r => r.id === id)?.codigo === '1057';
  });

  readonly isRegimen276 = computed(() => {
    const id = this.regimenSeleccionado();
    return this.regimenes().find(r => r.id === id)?.codigo === '276';
  });

  readonly isModalidadCasEnabled = computed(() => {
    const tcId = this.tipoContratoId();
    const tc = this.tiposContrato().find(t => t.id === tcId);
    return this.isRegimen1057() && tc?.codigo === 'PLAZO_DETERMINADO';
  });

  readonly canGenerar = computed(() => {
    if (!this.periodoSeleccionado() || !this.regimenSeleccionado() || !this.conceptoSeleccionado()) {
      return false;
    }

    return true;
  });

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarCatalogos();
  }



  private cargarCatalogos(): void {
    this.catalogoApi.listarRegimenesLaborales().subscribe({
      next: (list) => {
        const filtrados = list.filter((r) => r.codigo !== '728' && r.codigo !== '9999');
        this.regimenes.set(filtrados);
      },
      error: () => this.regimenes.set([]),
    });
    this.catalogoApi.listarTiposContrato().subscribe({
      next: (list) => this.tiposContrato.set(list),
      error: () => this.tiposContrato.set([]),
    });
    this.catalogoApi.listarCondicionesLaborales().subscribe({
      next: (list) => {
        const filtradas = list.filter((c) => c.codigo === 'NOMBRADO' || c.codigo === 'CONTRATADO');
        this.condicionesLaborales.set(filtradas);
      },
      error: () => this.condicionesLaborales.set([]),
    });
    this.catalogoApi.listarModalidadesCas().subscribe({
      next: (list) => this.modalidadesCas.set(list),
      error: () => this.modalidadesCas.set([]),
    });
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.resetState();
  }

  onRegimenChange(id: number): void {
    this.regimenSeleccionado.set(id);
    this.conceptoSeleccionado.set(null);
    this.evaluarRegimen();
  }

  private evaluarRegimen(): void {
    const regimenId = this.regimenSeleccionado();
    const regimen = this.regimenes().find((r) => r.id === regimenId);
    if (!regimen) return;

    if (regimen.codigo === '1057') {
      this.condicionLaboralId.set(null);
    } else if (regimen.codigo === '276') {
      this.tipoContratoId.set(null);
      this.modalidadCasId.set(null);
    }
  }

  onTipoContratoChange(id: number): void {
    this.tipoContratoId.set(id);
    this.evaluarModalidadCas();
  }

  private evaluarModalidadCas(): void {
    const tcId = this.tipoContratoId();
    const tc = this.tiposContrato().find((t) => t.id === tcId);
    const regimenId = this.regimenSeleccionado();
    const regimen = this.regimenes().find((r) => r.id === regimenId);

    if (regimen?.codigo === '1057' && tc?.codigo === 'PLAZO_DETERMINADO') {
      // Activo
    } else {
      this.modalidadCasId.set(null);
    }
  }

  private resetState(): void {
    this.fase.set('idle');
    this.movimientosPost.set([]);
    this.resultado.set(null);
  }

  confirmarGeneracion(): void {
    const periodo = this.periodoSeleccionado();
    if (!periodo || !this.canGenerar()) return;

    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: `Generar planilla masiva — ${periodo}`,
        message: `Se ejecutará el cálculo de planilla para todos los empleados activos en el periodo ${periodo}. La operación puede tomar varios segundos. ¿Continuar?`,
        confirmLabel: 'Generar planilla',
        cancelLabel: 'Cancelar',
        severity: 'info',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.ejecutar(periodo);
    });
  }

  private cargarPeriodos(): void {
    this.loading.set(true);
    this.periodoApi.listar().subscribe({
      next: (rows) => {
        const ordenados = [...rows].sort((a, b) => b.periodo.localeCompare(a.periodo));
        this.periodos.set(ordenados);
        const inicial = ordenados.find((p) => p.estado === 'ABIERTO');
        if (inicial) {
          this.periodoSeleccionado.set(inicial.periodo);
        }
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  /** Disparador real de la generación (uso post-confirmación). Público como test seam. */
  ejecutar(periodo: string): void {
    this.fase.set('generando');
    this.movimientosPost.set([]);
    this.resultado.set(null);

    const payloadCabecera = {
      periodo: periodo,
      regimenLaboralId: this.regimenSeleccionado()!,
      tipoContratoId: this.tipoContratoId() ?? undefined,
      condicionLaboralId: this.condicionLaboralId() ?? undefined,
      modalidadCasId: this.modalidadCasId() ?? undefined,
      concepto: this.conceptoSeleccionado() ?? '',
      tipoPlanilla: 'ORDINARIA',
      ordenBoleta: this.ordenBoletaSeleccionado(),
    };

    this.generadorApi.generarMasivo(payloadCabecera).subscribe({
      next: (resultado) => {
        this.resultado.set(resultado);
        this.snack.open(
          `Generación completada: ${resultado.exitosos} de ${resultado.total} exitoso(s)` +
            (resultado.fallidos.length > 0 ? `, ${resultado.fallidos.length} con error.` : '.'),
          'Cerrar',
          { duration: 6000 },
        );
        this.cargarMovimientosResultantes(periodo, resultado.exitososIds);
      },
      error: (err: HttpErrorResponse) => this.handleGenerarError(err),
    });
  }

  private cargarMovimientosResultantes(periodo: string, filterIds?: ReadonlyArray<number>): void {
    this.movimientoApi.listarPeriodo(periodo).subscribe({
      next: (rows) => {
        let finalRows = rows;
        if (filterIds && filterIds.length > 0) {
          finalRows = rows.filter(r => filterIds.includes(r.empleadoId));
        }
        this.movimientosPost.set(finalRows);
        this.fase.set('completado');
      },
      error: (err: HttpErrorResponse) => {
        this.fase.set('completado');
        this.onHttpSnack(err);
      },
    });
  }

  private handleGenerarError(err: HttpErrorResponse): void {
    this.fase.set('idle');
    this.onHttpSnack(err);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
