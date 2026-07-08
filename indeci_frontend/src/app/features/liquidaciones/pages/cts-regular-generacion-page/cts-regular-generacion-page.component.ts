import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HistorialLotesComponent } from '../../../planilla/components/historial-lotes/historial-lotes.component';

import { sisrhConfirmDialogConfig } from '../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { CtsRegularApiService } from '../../../planilla/services/cts-regular-api.service';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import { PlanillaLoteApiService } from '../../../planilla/services/planilla-lote-api.service';
import type { RegimenLaboral } from '../../../catalogos/models/regimen-laboral.model';
import type { PlanillaLoteDashboardRow } from '../../../planilla/models/planilla-lote.model';
import type { CtsRegularResult } from '../../../planilla/models/cts-regular.model';

@Component({
  selector: 'app-cts-regular-generacion-page',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    HistorialLotesComponent,
  ],
  templateUrl: './cts-regular-generacion-page.component.html',
  styleUrl: './cts-regular-generacion-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtsRegularGeneracionPageComponent implements OnInit {
  private readonly dialogs = inject(MatDialog);
  private readonly api = inject(CtsRegularApiService);
  private readonly catalogos = inject(CatalogoApiService);
  private readonly loteApi = inject(PlanillaLoteApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly snack = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);


  readonly periodo = signal<string>('');
  readonly regimenLaboralId = signal<number | null>(null);
  
  readonly regimenes = signal<readonly RegimenLaboral[]>([]);
  readonly lotesHistorial = signal<PlanillaLoteDashboardRow[]>([]);
  readonly cargandoHistorial = signal(false);

  readonly generando = signal(false);
  readonly resultado = signal<CtsRegularResult | null>(null);

  // CTS Solo se debe habilitar si el mes es Mayo (05) o Noviembre (11)
  readonly puedeGenerar = computed(() => {
    const p = this.periodo().trim();
    if (p.length !== 7) return false;
    const mes = p.split('-')[1];
    return mes === '05' || mes === '11';
  });

  // Texto legible del régimen heredado del módulo de generación (solo lectura).
  readonly regimenTexto = computed(() => {
    const id = this.regimenLaboralId();
    if (id == null) return 'Todos los permitidos';
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
       // El módulo inicial envía el ID en 'regimenLaboralId'; 'regimen' lleva el código.
       if (params['regimenLaboralId']) {
         this.regimenLaboralId.set(Number(params['regimenLaboralId']));
       }
    });
  }

  private cargarCatalogos(): void {
    this.catalogos.listarRegimenesLaborales().subscribe({
      next: (data: readonly RegimenLaboral[]) => {
         // CTS Regular no aplica para CAS, bloqueamos visualmente o marcamos
         this.regimenes.set(data.filter(r => !['1057', 'CAS'].includes(r.codigo)));
      },
      error: () => this.snack.open('Error al cargar regímenes', 'Cerrar', { duration: 3000 })
    });
  }

  cargarHistorial(): void {
    const p = this.periodo();
    if (p.length < 7) return;
    
    this.cargandoHistorial.set(true);
    const regimenCode = this.regimenLaboralId() 
      ? this.regimenes().find(r => r.id === this.regimenLaboralId())?.codigo 
      : undefined;

    this.loteApi.obtenerLotesDashboard(p, regimenCode).subscribe({
      next: (lotes) => {
        this.lotesHistorial.set(lotes.filter(l => l.tipoPlanilla === 'CTS_REGULAR'));
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
    if (!this.puedeGenerar()) return;

    const regimenTexto = this.regimenLaboralId() 
        ? this.regimenes().find(r => r.id === this.regimenLaboralId())?.nombre 
        : 'Todos los regímenes permitidos';

    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Generar CTS Regular (Mayo/Noviembre)',
        message:
          `Se generará el Depósito Semestral de CTS del período ${periodo} para ${regimenTexto}.\n\n` +
          `Nota: Los trabajadores CAS están excluidos normativamente de este proceso.\n\n` +
          `¿Continuar?`,
        confirmLabel: 'Generar CTS',
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
        a.download = `CTS_${periodo}_${empleadoId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snack.open('Error al descargar el PDF', 'Cerrar', { duration: 3000 })
    });
  }
}
