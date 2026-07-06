import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';

import { PlanillaLoteApiService, CandidatoAdicionalDto } from '../../services/planilla-lote-api.service';
import { PeriodoPlanillaApiService } from '../../services/periodo-planilla-api.service';
import { ConceptoPlanillaApiService } from '../../services/concepto-planilla-api.service';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { GeneracionAdicionalManualDialogComponent } from '../generacion-masiva-page/components/generacion-adicional-manual-dialog/generacion-adicional-manual-dialog.component';
import { RegistrarReintegroDialogComponent } from './components/registrar-reintegro-dialog/registrar-reintegro-dialog.component';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';

import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PeriodoPlanillaRow } from '../../models/periodo-planilla.model';
import type { ConceptoPlanillaRow } from '../../models/concepto-planilla.model';
import type { RegimenLaboral } from '../../../catalogos/models/regimen-laboral.model';
import type { TipoContrato } from '../../../catalogos/models/tipo-contrato.model';
import type { CondicionLaboral } from '../../../catalogos/models/condicion-laboral.model';
import type { ModalidadCas } from '../../../catalogos/models/modalidad-cas.model';
import type { PlanillaLoteDashboardRow } from '../../models/planilla-lote.model';

@Component({
  selector: 'app-planilla-adicional-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatButtonModule, MatCardModule, MatIconModule, MatInputModule, 
    MatSelectModule, MatTableModule, MatTabsModule, MatCheckboxModule,
    MatProgressBarModule, MatProgressSpinnerModule, MatDividerModule
  ],
  templateUrl: './planilla-adicional-page.component.html',
  styleUrls: ['./planilla-adicional-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanillaAdicionalPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);
  private readonly planillaLoteApi = inject(PlanillaLoteApiService);
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly conceptoApi = inject(ConceptoPlanillaApiService);
  private readonly catalogoApi = inject(CatalogoApiService);
  private readonly errorMessage = inject(ErrorMessageService);
  private readonly dialogs = inject(MatDialog);

  // --- Estado Global ---
  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodosAbiertos = computed(() => this.periodos().filter(p => p.estado === 'ABIERTO'));
  readonly periodoSeleccionado = signal<string | null>(null);
  
  readonly regimenes = signal<readonly RegimenLaboral[]>([]);
  readonly regimenSeleccionado = signal<number | null>(null);

  // --- Filtros de clasificación laboral (F1) ---
  readonly tiposContrato = signal<readonly TipoContrato[]>([]);
  readonly condicionesLaborales = signal<readonly CondicionLaboral[]>([]);
  readonly modalidadesCas = signal<readonly ModalidadCas[]>([]);
  readonly tipoContratoId = signal<number | null>(null);
  readonly condicionLaboralId = signal<number | null>(null);
  readonly modalidadCasId = signal<number | null>(null);

  /** Régimen CAS (1057): usa modalidad, no condición laboral. */
  readonly isRegimen1057 = computed(() =>
    this.regimenes().find(r => r.id === this.regimenSeleccionado())?.codigo === '1057');
  /** Régimen 276: usa condición laboral, no tipo contrato ni modalidad. */
  readonly isRegimen276 = computed(() =>
    this.regimenes().find(r => r.id === this.regimenSeleccionado())?.codigo === '276');
  /** Modalidad CAS solo aplica a 1057 con tipo de contrato a plazo determinado. */
  readonly isModalidadCasEnabled = computed(() => {
    const tc = this.tiposContrato().find(t => t.id === this.tipoContratoId());
    return this.isRegimen1057() && tc?.codigo === 'PLAZO_DETERMINADO';
  });

  readonly loading = signal(false);
  readonly generando = signal(false);

  // --- Tab 1: Generación ---
  readonly conceptosOperativos = signal<readonly ConceptoPlanillaRow[]>([]);
  readonly conceptosSeleccionados = signal<string[]>([]);
  readonly motivo = signal<string>('');
  readonly sustento = signal<string>('');
  
  readonly candidatos = signal<readonly CandidatoAdicionalDto[]>([]);
  readonly searchQuery = signal<string>('');
  readonly candidatosFiltrados = computed(() => {
    let rows = this.candidatos();

    // Régimen (por código, comparación exacta contra el catálogo seleccionado)
    const regId = this.regimenSeleccionado();
    if (regId !== null) {
      const cod = this.regimenes().find(r => r.id === regId)?.codigo;
      if (cod) rows = rows.filter(c => c.regimenLaboral === cod);
    }

    // Clasificación laboral (F1)
    const tc = this.tipoContratoId();
    if (tc !== null) rows = rows.filter(c => c.tipoContratoId === tc);
    const cl = this.condicionLaboralId();
    if (cl !== null) rows = rows.filter(c => c.condicionLaboralId === cl);
    const mc = this.modalidadCasId();
    if (mc !== null) rows = rows.filter(c => c.modalidadCasId === mc);

    // Búsqueda por DNI o nombre
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      rows = rows.filter(c =>
        c.dni.includes(query) || c.nombre.toLowerCase().includes(query));
    }
    return rows;
  });
  
  readonly selection = new SelectionModel<CandidatoAdicionalDto>(true, []);
  readonly columnsCandidatos = ['select', 'dni', 'nombre', 'regimenLaboral', 'fechaIngreso', 'motivo'] as const;

  // --- Tab 2: Historial ---
  readonly lotesHistorial = signal<readonly PlanillaLoteDashboardRow[]>([]);
  readonly columnsHistorial = ['id', 'periodo', 'regimen', 'motivo', 'empleados', 'monto', 'creadoEn', 'estado', 'acciones'] as const;

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarConceptos();
    this.cargarPeriodos();
  }

  private cargarPeriodos(): void {
    this.loading.set(true);
    this.periodoApi.listar().subscribe({
      next: (rows) => {
        const ordenados = [...rows].sort((a, b) => b.periodo.localeCompare(a.periodo));
        this.periodos.set(ordenados);
        
        // Recuperar query params
        const qParams = this.route.snapshot.queryParams;
        if (qParams['periodo']) {
          this.periodoSeleccionado.set(qParams['periodo']);
        } else {
          const abierto = ordenados.find(p => p.estado === 'ABIERTO');
          if (abierto) this.periodoSeleccionado.set(abierto.periodo);
        }
        
        if (qParams['regimen']) {
          this.regimenSeleccionado.set(Number(qParams['regimen']));
        }
        
        this.loading.set(false);
        this.cargarDatosSiPosible();
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Error al cargar periodos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private cargarCatalogos(): void {
    this.catalogoApi.listarRegimenesLaborales().subscribe(list => {
      this.regimenes.set(list.filter(r => r.codigo !== '728' && r.codigo !== '9999'));
    });
    this.catalogoApi.listarTiposContrato().subscribe(list => this.tiposContrato.set(list));
    this.catalogoApi.listarCondicionesLaborales().subscribe(list => this.condicionesLaborales.set(list));
    this.catalogoApi.listarModalidadesCas().subscribe(list => this.modalidadesCas.set(list));
  }

  private cargarConceptos(): void {
    this.conceptoApi.listar().subscribe((rows: readonly ConceptoPlanillaRow[]) => {
      this.conceptosOperativos.set(rows);
    });
  }

  onPeriodoChange(p: string): void {
    this.periodoSeleccionado.set(p);
    this.actualizarUrl();
    this.cargarDatosSiPosible();
  }

  onRegimenChange(rId: number | null): void {
    this.regimenSeleccionado.set(rId);
    // Reset en cascada de filtros no aplicables al régimen (mismo criterio que
    // Generación Masiva): 1057 no usa condición; 276 no usa contrato ni modalidad.
    if (this.isRegimen1057()) {
      this.condicionLaboralId.set(null);
    } else if (this.isRegimen276()) {
      this.tipoContratoId.set(null);
      this.modalidadCasId.set(null);
    }
    this.actualizarUrl();
    this.cargarDatosSiPosible();
  }

  onTipoContratoChange(id: number | null): void {
    this.tipoContratoId.set(id);
    if (!this.isModalidadCasEnabled()) {
      this.modalidadCasId.set(null);
    }
  }

  private actualizarUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        periodo: this.periodoSeleccionado(),
        regimen: this.regimenSeleccionado()
      },
      queryParamsHandling: 'merge',
    });
  }

  private cargarDatosSiPosible(): void {
    const periodo = this.periodoSeleccionado();
    if (!periodo) return;

    this.cargarCandidatos(periodo);
    this.cargarHistorial(periodo);
  }

  private cargarCandidatos(periodo: string): void {
    this.loading.set(true);
    this.planillaLoteApi.obtenerCandidatosAdicionales(periodo).subscribe({
      next: (rows: CandidatoAdicionalDto[]) => {
        // El filtrado por régimen y clasificación laboral es reactivo
        // (candidatosFiltrados). Aquí solo se cargan los candidatos del período.
        this.candidatos.set(rows);
        this.selection.clear();
        this.loading.set(false);
      },
      error: () => {
        this.candidatos.set([]);
        this.loading.set(false);
      }
    });
  }

  private cargarHistorial(periodo: string): void {
    const regId = this.regimenSeleccionado();
    const regimenCod = regId ? this.regimenes().find(r => r.id === regId)?.codigo : undefined;
    
    this.planillaLoteApi.obtenerLotesDashboard(periodo, regimenCod).subscribe({
      next: (rows: readonly PlanillaLoteDashboardRow[]) => {
        this.lotesHistorial.set(rows.filter((r: PlanillaLoteDashboardRow) => r.tipoPlanilla === 'ADICIONAL' || r.tipoPlanilla?.includes('ADICIONAL')));
      },
      error: () => this.lotesHistorial.set([])
    });
  }

  abrirDialogoManual(): void {
    const regId = this.regimenSeleccionado();
    if (!regId) {
      this.snack.open('Seleccione un régimen laboral primero.', 'Cerrar', { duration: 3000 });
      return;
    }
    const regimenCod = this.regimenes().find(r => r.id === regId)?.codigo;

    const ref = this.dialogs.open(GeneracionAdicionalManualDialogComponent, { 
      width: '500px', 
      disableClose: true,
      data: { regimenSeleccionado: regimenCod }
    });
    ref.afterClosed().subscribe((res: any) => {
      if (res?.candidato) {
        const existe = this.candidatos().some(c => c.empleadoId === res.candidato.empleadoId);
        if (!existe) {
          this.candidatos.set([...this.candidatos(), res.candidato]);
          this.selection.select(res.candidato);
          this.snack.open('Candidato añadido manualmente', 'Cerrar', { duration: 3000 });
        } else {
          this.snack.open('El empleado ya está en la lista', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  abrirDialogoReintegro(): void {
    const periodo = this.periodoSeleccionado();
    if (!periodo) return;
    const ref = this.dialogs.open(RegistrarReintegroDialogComponent, {
      width: '520px', disableClose: true, data: { periodo },
    });
    ref.afterClosed().subscribe((ok: boolean | undefined) => {
      // Al registrar un reintegro PENDIENTE, refrescar candidatos (aparecerá como
      // motivo REINTEGRO una vez implementada la detección — BLOQUE 3).
      if (ok) this.cargarDatosSiPosible();
    });
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.candidatosFiltrados().length;
    return numSelected === numRows && numRows > 0;
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.candidatosFiltrados());
  }

  get canGenerar(): boolean {
    return this.periodoSeleccionado() !== null && 
           this.regimenSeleccionado() !== null &&
           this.conceptosSeleccionados().length > 0 && 
           this.motivo().trim() !== '' && 
           this.sustento().trim() !== '' && 
           this.selection.selected.length > 0;
  }

  confirmarGeneracion(): void {
    if (!this.canGenerar) return;

    const ref = this.dialogs.open(ConfirmDialogComponent, sisrhConfirmDialogConfig({
      title: 'Generar Planilla Adicional',
      message: `Se ejecutará la planilla adicional para ${this.selection.selected.length} empleado(s). ¿Continuar?`,
      confirmLabel: 'Generar',
      cancelLabel: 'Cancelar',
      severity: 'info'
    }));

    ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok) this.ejecutarGeneracion();
    });
  }

  private ejecutarGeneracion(): void {
    this.generando.set(true);
    const request = {
      empleadosIds: this.selection.selected.map(c => c.empleadoId),
      motivo: this.motivo(),
      sustento: this.sustento(),
      conceptos: this.conceptosSeleccionados(),
      regimenId: this.regimenSeleccionado(),
      periodo: this.periodoSeleccionado()
    };

    this.planillaLoteApi.generarLoteAdicional(request).subscribe({
      next: () => {
        this.generando.set(false);
        this.snack.open('Planilla adicional generada correctamente', 'Cerrar', { duration: 4000 });
        this.motivo.set('');
        this.sustento.set('');
        this.conceptosSeleccionados.set([]);
        this.selection.clear();
        this.cargarDatosSiPosible();
      },
      error: (err: HttpErrorResponse) => {
        this.generando.set(false);
        this.onHttpSnack(err);
      }
    });
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errorMessage.translate(body.mensaje)
      : 'Error inesperado al comunicarse con el servidor.';
    this.snack.open(msg, 'Cerrar', { duration: 5000 });
  }

  verMovimientos(loteId: number): void {
    void this.router.navigate(['/planilla/movimientos'], { queryParams: { loteId } });
  }

  fmtMonto(val: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val ?? 0);
  }
}
