import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { SelectionModel } from '@angular/cdk/collections';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { GeneracionAdicionalManualDialogComponent, GeneracionAdicionalManualResult } from './components/generacion-adicional-manual-dialog/generacion-adicional-manual-dialog.component';
import { PeriodoPlanillaApiService } from '../../services/periodo-planilla-api.service';
import { MovimientoPlanillaApiService } from '../../services/movimiento-planilla-api.service';
import { GeneradorPlanillaApiService } from '../../services/generador-planilla-api.service';
import { PlanillaLoteApiService, CandidatoAdicionalDto } from '../../services/planilla-lote-api.service';
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

export const CONCEPTOS_CATALOGO: CatalogoItem[] = [
  { codigo: 'PLA_HABERES', etiqueta: 'Haberes / Sueldo Mensual' },
  { codigo: 'PLA_ADICIONAL', etiqueta: 'Planilla Adicional / Reintegros' },
  { codigo: 'PLA_AGUINALDO', etiqueta: 'Aguinaldos y Gratificaciones' },
  { codigo: 'PLA_CTS', etiqueta: 'Compensación por Tiempo de Servicios (CTS)' },
  { codigo: 'PLA_VAC_TRUN', etiqueta: 'Vacaciones Truncas y No Gozadas' },
  { codigo: 'PLA_DESC_SUBV', etiqueta: 'Descanso Subvencionado' }
];

export const COMPATIBILIDAD_PLANILLA_MAP: Record<string, string[]> = {
  '276': ['PLA_HABERES', 'PLA_ADICIONAL', 'PLA_AGUINALDO', 'PLA_VAC_TRUN'],
  '728': ['PLA_HABERES', 'PLA_ADICIONAL', 'PLA_AGUINALDO', 'PLA_CTS', 'PLA_VAC_TRUN'],
  '1057': ['PLA_HABERES', 'PLA_ADICIONAL', 'PLA_AGUINALDO', 'PLA_VAC_TRUN'],
  '30057': ['PLA_HABERES', 'PLA_ADICIONAL', 'PLA_AGUINALDO', 'PLA_CTS', 'PLA_VAC_TRUN'],
  'FORMATIVA': ['PLA_HABERES', 'PLA_ADICIONAL', 'PLA_DESC_SUBV']
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
  readonly columnsCandidatos = ['select', 'dni', 'nombre', 'regimenLaboral', 'fechaIngreso', 'motivo'] as const;

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly tipoPlanilla = signal<'ORDINARIA' | 'ADICIONAL'>('ORDINARIA');
  
  readonly regimenSeleccionado = signal<number | null>(null);
  readonly tipoContratoId = signal<number | null>(null);
  readonly condicionLaboralId = signal<number | null>(null);
  readonly modalidadCasId = signal<number | null>(null);

  readonly conceptoSeleccionado = signal<string | null>(null);
  readonly ordenBoletaSeleccionado = signal<string>('POR_DEPENDENCIA');
  
  readonly regimenes = signal<readonly RegimenLaboral[]>([]);
  readonly tiposContrato = signal<readonly TipoContrato[]>([]);
  readonly condicionesLaborales = signal<readonly CondicionLaboral[]>([]);
  readonly modalidadesCas = signal<readonly ModalidadCas[]>([]);
  
  readonly candidatos = signal<readonly CandidatoAdicionalDto[]>([]);
  readonly selection = new SelectionModel<CandidatoAdicionalDto>(true, []);

  readonly loading = signal(true);
  readonly fase = signal<FaseGeneracion>('idle');
  readonly movimientosPost = signal<readonly MovimientoPlanillaRow[]>([]);
  /** Resultado de la última generación masiva (Spec 011 / C2). */
  readonly resultado = signal<GeneracionMasivaResultado | null>(null);

  readonly periodosAbiertos = computed(() => this.periodos().filter((p) => p.estado === 'ABIERTO'));

  readonly conceptosPermitidos = computed(() => {
    const regimenId = this.regimenSeleccionado();
    if (!regimenId) return [];
    
    const regimenCode = this.regimenes().find(r => r.id === regimenId)?.codigo;
    if (!regimenCode) return [];
    
    const allowedCodes = COMPATIBILIDAD_PLANILLA_MAP[regimenCode] || [];
    return CONCEPTOS_CATALOGO.filter(c => allowedCodes.includes(c.codigo));
  });

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
    if (this.fase() === 'generando' || this.periodoSeleccionado() === null) return false;
    if (!this.regimenSeleccionado() || !this.conceptoSeleccionado()) return false;
    if (this.tipoPlanilla() === 'ADICIONAL' && this.selection.selected.length === 0) return false;
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
      next: (list) => this.condicionesLaborales.set(list),
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
    if (this.tipoPlanilla() === 'ADICIONAL') {
      this.cargarCandidatos(periodo);
    }
  }

  onTipoPlanillaChange(tipo: 'ORDINARIA' | 'ADICIONAL'): void {
    this.tipoPlanilla.set(tipo);
    this.resetState();
    const periodo = this.periodoSeleccionado();
    if (tipo === 'ADICIONAL' && periodo) {
      this.cargarCandidatos(periodo);
    }
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
    this.selection.clear();
    this.candidatos.set([]);
  }

  private cargarCandidatos(periodo: string): void {
    this.loading.set(true);
    this.planillaLoteApi.obtenerCandidatosAdicionales(periodo).subscribe({
      next: (rows) => {
        this.candidatos.set(rows);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  confirmarGeneracion(): void {
    const periodo = this.periodoSeleccionado();
    if (!periodo || !this.canGenerar()) return;

    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: `Generar planilla ${this.tipoPlanilla() === 'ORDINARIA' ? 'masiva' : 'adicional'} — ${periodo}`,
        message: this.tipoPlanilla() === 'ORDINARIA'
          ? `Se ejecutará el cálculo de planilla para todos los empleados activos en el periodo ${periodo}. La operación puede tomar varios segundos. ¿Continuar?`
          : `Se ejecutará el cálculo de planilla adicional para ${this.selection.selected.length} empleado(s). ¿Continuar?`,
        confirmLabel: 'Generar planilla',
        cancelLabel: 'Cancelar',
        severity: 'info',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.ejecutar(periodo);
    });
  }

  abrirDialogoManual(): void {
    const ref = this.dialogs.open<GeneracionAdicionalManualDialogComponent, any, GeneracionAdicionalManualResult>(
      GeneracionAdicionalManualDialogComponent,
      { width: '500px', disableClose: true }
    );
    ref.afterClosed().subscribe(res => {
      if (res && res.candidato) {
        // Verificar si ya existe para no duplicar
        const existe = this.candidatos().some(c => c.empleadoId === res.candidato.empleadoId);
        if (!existe) {
          const nuevaLista = [...this.candidatos(), res.candidato];
          this.candidatos.set(nuevaLista);
          this.selection.select(res.candidato);
          this.snack.open('Candidato añadido manualmente a la lista', 'Cerrar', { duration: 3000 });
        } else {
          this.snack.open('El empleado ya está en la lista de candidatos', 'Cerrar', { duration: 3000 });
        }
      }
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
      tipoContratoId: this.tipoContratoId(),
      condicionLaboralId: this.condicionLaboralId(),
      modalidadCasId: this.modalidadCasId(),
      concepto: this.conceptoSeleccionado() ?? '',
      ordenBoleta: this.ordenBoletaSeleccionado() ?? '',
      tipoPlanilla: this.tipoPlanilla()
    };

    if (this.tipoPlanilla() === 'ORDINARIA') {
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
    } else {
      const empleadosIds = this.selection.selected.map(c => c.empleadoId);
      this.planillaLoteApi.generarLoteAdicional(payloadCabecera as any, { empleadosIds }).subscribe({
        next: () => {
          this.snack.open('Generación de planilla adicional completada.', 'Cerrar', { duration: 6000 });
          this.cargarMovimientosResultantes(periodo, empleadosIds);
          // Recargar candidatos para quitar los ya procesados o mantener la vista
          this.cargarCandidatos(periodo);
        },
        error: (err: HttpErrorResponse) => this.handleGenerarError(err),
      });
    }
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

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.candidatos().length;
    return numSelected === numRows && numRows > 0;
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.candidatos());
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
