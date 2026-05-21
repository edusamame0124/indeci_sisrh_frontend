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
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import { AbonoBancoApiService } from '../../../planilla/services/abono-banco-api.service';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import type {
  AbonoBancoRow,
  ResumenBancoRow,
} from '../../../planilla/models/abono-banco.model';

/** Datos de identificación de un empleado para el detalle de abonos. */
interface EmpleadoInfo {
  readonly nombre: string;
  readonly dni: string;
}

/**
 * PANTALLA-07 — Archivo Bancos (SPEC §12.2, ROL_TESORERIA).
 *
 * - Genera los abonos del período desde los movimientos de planilla (M14).
 * - Resumen por banco con total y detalle expandible de empleados.
 * - Descarga del archivo TXT por banco para la carga bancaria.
 * - Registro del ticket MCPP por abono o masivo → pasa el abono a PROCESADO.
 */
@Component({
  selector: 'app-archivo-bancos-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './archivo-bancos-page.component.html',
  styleUrl: './archivo-bancos-page.component.css',
})
export class ArchivoBancosPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly abonoApi = inject(AbonoBancoApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly empleadoInfo = signal<ReadonlyMap<number, EmpleadoInfo>>(new Map());
  readonly bancos = signal<readonly ResumenBancoRow[]>([]);

  readonly loading = signal(true);
  readonly tableLoading = signal(false);
  readonly generando = signal(false);
  readonly descargando = signal(false);

  /** Total general de todos los bancos y conteo de abonos. */
  readonly totales = computed(() => {
    let monto = 0;
    let abonos = 0;
    let pendientes = 0;
    for (const b of this.bancos()) {
      monto += b.totalNeto;
      abonos += b.cantidad;
      pendientes += b.abonos.filter((a) => a.estado === 'PENDIENTE').length;
    }
    return { monto: this.round2(monto), abonos, pendientes };
  });

  ngOnInit(): void {
    this.cargarBase();
  }

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.cargarResumen();
  }

  nombreEmpleado(empleadoId: number): string {
    return this.empleadoInfo().get(empleadoId)?.nombre ?? `Empleado #${empleadoId}`;
  }

  dniEmpleado(empleadoId: number): string {
    return this.empleadoInfo().get(empleadoId)?.dni ?? '—';
  }

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  // ============ Generar abonos ============

  generarAbonos(): void {
    const periodo = this.periodoSeleccionado();
    if (periodo == null) return;
    this.generando.set(true);
    this.abonoApi.generarAbonos(periodo).subscribe({
      next: (cantidad) => {
        this.generando.set(false);
        this.snack.open(`${cantidad} abono(s) generado(s).`, 'Cerrar', { duration: 4000 });
        this.cargarResumen();
      },
      error: (err: HttpErrorResponse) => {
        this.generando.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  // ============ Ticket MCPP ============

  registrarTicket(abono: AbonoBancoRow, valor: string): void {
    const ticket = valor.trim();
    if (!ticket) {
      this.snack.open('Ingresa el número de ticket MCPP.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.abonoApi.registrarTicket(abono.id, ticket).subscribe({
      next: () => {
        this.snack.open('Ticket MCPP registrado — abono procesado.', 'Cerrar', {
          duration: 4000,
        });
        this.cargarResumen();
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  registrarTicketMasivo(banco: ResumenBancoRow, valor: string): void {
    const ticket = valor.trim();
    if (!ticket) {
      this.snack.open('Ingresa el número de ticket MCPP.', 'Cerrar', { duration: 4000 });
      return;
    }
    const ids = banco.abonos
      .filter((a) => a.estado === 'PENDIENTE')
      .map((a) => a.id);
    if (ids.length === 0) {
      this.snack.open(`El banco ${banco.banco} no tiene abonos pendientes.`, 'Cerrar', {
        duration: 5000,
      });
      return;
    }
    this.abonoApi.registrarTicketMasivo(ids, ticket).subscribe({
      next: (cantidad) => {
        this.snack.open(`Ticket aplicado a ${cantidad} abono(s).`, 'Cerrar', { duration: 4000 });
        this.cargarResumen();
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  // ============ Archivo bancario (ZIP por banco) ============

  /**
   * Descarga el ZIP con un .txt de abonos por banco (Spec 013 / C1 · P-07).
   * El backend arma el layout oficial de 10 campos tabulados por banco.
   */
  descargarArchivoBancario(): void {
    const periodo = this.periodoSeleccionado();
    if (periodo == null || this.descargando()) return;

    this.descargando.set(true);
    this.abonoApi.descargarArchivoZip(periodo).subscribe({
      next: (blob) => {
        this.descargando.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `archivo-bancos-${periodo.replace('-', '')}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        this.descargando.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  // ============ Carga de datos ============

  private cargarBase(): void {
    this.loading.set(true);
    forkJoin({
      periodos: this.periodoApi.listar(),
      personas: this.personaApi.listar(),
    }).subscribe({
      next: ({ periodos, personas }) => {
        const ordenados = [...periodos].sort((a, b) => b.periodo.localeCompare(a.periodo));
        this.periodos.set(ordenados);
        const mapa = new Map<number, EmpleadoInfo>();
        for (const p of personas) {
          if (p.empleadoId != null) {
            mapa.set(p.empleadoId, { nombre: p.nombreCompleto, dni: p.dni });
          }
        }
        this.empleadoInfo.set(mapa);
        this.loading.set(false);
        const inicial = ordenados.find((p) => p.estado === 'ABIERTO') ?? ordenados[0];
        if (inicial) this.onPeriodoChange(inicial.periodo);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private cargarResumen(): void {
    const periodo = this.periodoSeleccionado();
    if (periodo == null) return;
    this.tableLoading.set(true);
    this.abonoApi.resumenPorBanco(periodo).subscribe({
      next: (filas) => {
        this.bancos.set(filas);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.bancos.set([]);
        this.onHttpSnack(err);
      },
    });
  }

  // ============ Helpers ============

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
