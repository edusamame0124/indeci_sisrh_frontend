import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { AguinaldoApiService } from '../../services/aguinaldo-api.service';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import { PlanillaLoteApiService } from '../../services/planilla-lote-api.service';
import type { AguinaldoResult } from '../../models/aguinaldo.model';
import type { RegimenLaboral } from '../../../catalogos/models/regimen-laboral.model';
import type { PlanillaLoteDashboardRow } from '../../models/planilla-lote.model';

@Component({
  selector: 'app-aguinaldo-generacion-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aguinaldo-generacion-page.component.html',
  styleUrl: './aguinaldo-generacion-page.component.scss',
})
export class AguinaldoGeneracionPageComponent implements OnInit {
  private readonly dialogs = inject(MatDialog);
  private readonly api = inject(AguinaldoApiService);
  private readonly catalogos = inject(CatalogoApiService);
  private readonly loteApi = inject(PlanillaLoteApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly snack = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);

  readonly colsExcluidos = ['empleadoId', 'motivo'] as const;
  readonly colsHistorial = ['id', 'periodo', 'regimenLaboralCodigo', 'estado', 'trabajadoresGenerados', 'netoTotal', 'creadoEn', 'acciones'] as const;

  readonly periodo = signal<string>('');
  readonly fechaCorte = signal<string>('');
  readonly regimenLaboralId = signal<number | null>(null);
  
  readonly regimenes = signal<readonly RegimenLaboral[]>([]);
  readonly lotesHistorial = signal<PlanillaLoteDashboardRow[]>([]);
  readonly cargandoHistorial = signal(false);

  /** % CAS con validación reactiva (min 0 / max 100). */
  readonly pctCas = new FormControl<number | null>(null, [Validators.min(0), Validators.max(100)]);

  readonly generando = signal(false);
  readonly resultado = signal<AguinaldoResult | null>(null);

  readonly puedeGenerar = computed(() => this.periodo().trim().length >= 6);

  ngOnInit(): void {
    this.cargarCatalogos();
    this.route.queryParams.subscribe(params => {
       if (params['periodo']) {
         this.periodo.set(params['periodo']);
         this.cargarHistorial();
       }
       if (params['regimen']) {
         this.regimenLaboralId.set(Number(params['regimen']));
       }
    });
  }

  private cargarCatalogos(): void {
    this.catalogos.listarRegimenesLaborales().subscribe({
      next: (data: readonly RegimenLaboral[]) => this.regimenes.set(data),
      error: () => this.snack.open('Error al cargar regímenes', 'Cerrar', { duration: 3000 })
    });
  }

  cargarHistorial(): void {
    const p = this.periodo();
    if (!p) return;
    
    this.cargandoHistorial.set(true);
    // Fetch lotes for TIPO_PLANILLA=AGUINALDO based on period.
    // The backend should return lotes associated with this period and regimen.
    const regimenCode = this.regimenLaboralId() 
      ? this.regimenes().find(r => r.id === this.regimenLaboralId())?.codigo 
      : undefined;

    this.loteApi.obtenerLotesDashboard(p, regimenCode).subscribe({
      next: (lotes) => {
        this.lotesHistorial.set(lotes.filter(l => l.tipoPlanilla === 'AGUINALDO'));
        this.cargandoHistorial.set(false);
      },
      error: () => {
        this.cargandoHistorial.set(false);
        this.snack.open('Error al cargar historial', 'Cerrar', { duration: 3000 });
      }
    });
  }

  isRegimen1057(): boolean {
    const rId = this.regimenLaboralId();
    if (!rId) return false;
    const reg = this.regimenes().find(r => r.id === rId);
    return reg?.codigo === '1057';
  }

  confirmarYGenerar(): void {
    const periodo = this.periodo().trim();
    if (periodo.length < 6 || this.pctCas.invalid) return;
    const pct = this.pctCas.value;

    const regimenTexto = this.regimenLaboralId() 
        ? this.regimenes().find(r => r.id === this.regimenLaboralId())?.nombre 
        : 'Todos los regímenes';

    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Generar aguinaldo',
        message:
          `Se generará el aguinaldo del período ${periodo} para ${regimenTexto}` +
          (pct != null ? ` con ${pct}% para CAS` : '') +
          `.\n\n` +
          `Nota: si se vuelve a generar para el mismo régimen y período, se actualizará el lote existente (Upsert). ` +
          `¿Continuar?`,
        confirmLabel: 'Generar',
        cancelLabel: 'Cancelar',
        severity: 'info',
      }),
    );

    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok !== true) return;
      this.generar(periodo, pct);
    });
  }

  private generar(periodo: string, pct: number | null): void {
    this.generando.set(true);
    this.resultado.set(null);
    this.api
      .generar({
        periodo,
        pctCas: pct,
        fechaCorte: this.fechaCorte() || null,
        regimenLaboralId: this.regimenLaboralId() || null,
      })
      .subscribe({
        next: (r) => {
          this.resultado.set(r);
          this.generando.set(false);
          this.cargarHistorial(); // Refrescar historial
        },
        error: (err: HttpErrorResponse) => {
          this.generando.set(false);
          const mensaje = (err.error as { mensaje?: string } | null)?.mensaje ?? null;
          this.snack.open(this.errors.translate(mensaje), 'Cerrar', { duration: 6000 });
        },
      });
  }
}
