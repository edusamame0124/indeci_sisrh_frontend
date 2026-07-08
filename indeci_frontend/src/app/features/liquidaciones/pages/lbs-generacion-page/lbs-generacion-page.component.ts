import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { LbsApiService } from '../../../planilla/services/lbs-api.service';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import { PlanillaLoteApiService } from '../../../planilla/services/planilla-lote-api.service';
import type { RegimenLaboral } from '../../../catalogos/models/regimen-laboral.model';
import type { PlanillaLoteDashboardRow } from '../../../planilla/models/planilla-lote.model';
import type { LbsResult } from '../../../planilla/models/lbs.model';

@Component({
  selector: 'app-lbs-generacion-page',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './lbs-generacion-page.component.html',
  styleUrl: './lbs-generacion-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LbsGeneracionPageComponent implements OnInit {
  private readonly dialogs = inject(MatDialog);
  private readonly api = inject(LbsApiService);
  private readonly catalogos = inject(CatalogoApiService);
  private readonly loteApi = inject(PlanillaLoteApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly snack = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);

  readonly colsHistorial = ['id', 'periodo', 'regimenLaboralCodigo', 'estado', 'trabajadoresGenerados', 'netoTotal', 'creadoEn', 'acciones'] as const;

  readonly periodo = signal<string>('');
  readonly regimenLaboralId = signal<number | null>(null);
  
  readonly regimenes = signal<readonly RegimenLaboral[]>([]);
  readonly lotesHistorial = signal<PlanillaLoteDashboardRow[]>([]);
  readonly cargandoHistorial = signal(false);

  readonly generando = signal(false);
  readonly resultado = signal<LbsResult | null>(null);

  readonly puedeGenerar = computed(() => this.periodo().trim().length >= 6);

  // Texto legible del régimen heredado del módulo de generación (solo lectura).
  readonly regimenTexto = computed(() => {
    const id = this.regimenLaboralId();
    if (id == null) return 'Todos los regímenes';
    const r = this.regimenes().find((x) => x.id === id);
    return r ? `${r.codigo} - ${r.nombre}` : '—';
  });

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
    const regimenCode = this.regimenLaboralId() 
      ? this.regimenes().find(r => r.id === this.regimenLaboralId())?.codigo 
      : undefined;

    this.loteApi.obtenerLotesDashboard(p, regimenCode).subscribe({
      next: (lotes) => {
        this.lotesHistorial.set(lotes.filter(l => l.tipoPlanilla === 'LBS'));
        this.cargandoHistorial.set(false);
      },
      error: () => {
        this.cargandoHistorial.set(false);
        this.snack.open('Error al cargar historial', 'Cerrar', { duration: 3000 });
      }
    });
  }

  confirmarYGenerar(): void {
    const periodo = this.periodo().trim();
    if (periodo.length < 6) return;

    const regimenTexto = this.regimenLaboralId() 
        ? this.regimenes().find(r => r.id === this.regimenLaboralId())?.nombre 
        : 'Todos los regímenes';

    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Generar Liquidación de Beneficios Sociales (LBS)',
        message:
          `Se generará la liquidación del período ${periodo} para personal cesado de ${regimenTexto}.\n\n` +
          `Nota: si se vuelve a generar, se actualizará el lote existente para aquellos sin boleta cerrada.\n\n` +
          `¿Continuar?`,
        confirmLabel: 'Generar LBS',
        cancelLabel: 'Cancelar',
        severity: 'info',
      }),
    );

    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok !== true) return;
      this.generar(periodo);
    });
  }

  private generar(periodo: string): void {
    this.generando.set(true);
    this.resultado.set(null);
    this.api
      .generar({
        periodo,
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

  descargarReporte(empleadoId: number, periodo: string): void {
    this.api.descargarReporte(empleadoId, periodo).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LBS_${periodo}_${empleadoId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snack.open('Error al descargar el PDF', 'Cerrar', { duration: 3000 })
    });
  }
}
