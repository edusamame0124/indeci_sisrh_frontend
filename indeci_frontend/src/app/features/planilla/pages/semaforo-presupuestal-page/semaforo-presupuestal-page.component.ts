import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MetaPresupuestalApiService } from '../../services/meta-presupuestal-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type {
  MetaCertificacionInput,
  SemaforoMeta,
  SemaforoPresupuestal,
} from '../../models/semaforo-presupuestal.model';

/** Meta sintética para empleados sin meta presupuestal — no se certifica. */
const SIN_META = '(sin meta)';

/**
 * Semáforo presupuestal del período (Spec 012 / C1 · P-05).
 *
 * Compara, por meta, el monto CERTIFICADO (techo que carga Tesorería) contra el
 * COMPROMETIDO (suma de netos de la planilla). Es información de control: no
 * altera el flujo de aprobación del período (los 3 gates de B7 siguen intactos).
 */
@Component({
  selector: 'app-semaforo-presupuestal-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './semaforo-presupuestal-page.component.html',
  styleUrl: './semaforo-presupuestal-page.component.css',
})
export class SemaforoPresupuestalPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(MetaPresupuestalApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly columnas = [
    'meta',
    'centroCosto',
    'fuenteFinanc',
    'pea',
    'certificado',
    'comprometido',
    'saldo',
    'estado',
  ] as const;

  readonly periodoId = signal(0);
  readonly semaforo = signal<SemaforoPresupuestal | null>(null);
  readonly loading = signal(true);
  readonly guardando = signal(false);

  /** Monto certificado en edición, por meta. */
  readonly montos = signal<Record<string, number>>({});

  readonly filas = computed<readonly SemaforoMeta[]>(() => this.semaforo()?.metas ?? []);

  ngOnInit(): void {
    const idRaw = this.route.snapshot.paramMap.get('id');
    const id = idRaw ? Number(idRaw) : NaN;
    if (!Number.isFinite(id) || id < 1) {
      void this.router.navigate(['/planilla/periodos']);
      return;
    }
    this.periodoId.set(id);
    this.cargar(id);
  }

  /** Las metas reales se certifican; la fila "(sin meta)" no. */
  esCertificable(meta: string): boolean {
    return meta !== SIN_META;
  }

  montoEditado(meta: string): number {
    return this.montos()[meta] ?? 0;
  }

  onMontoChange(meta: string, valor: number): void {
    const limpio = Number.isFinite(valor) && valor >= 0 ? valor : 0;
    this.montos.update((prev) => ({ ...prev, [meta]: limpio }));
  }

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  guardar(): void {
    const snap = this.semaforo();
    if (snap === null || this.guardando()) return;

    const entradas: MetaCertificacionInput[] = snap.metas
      .filter((m) => this.esCertificable(m.meta))
      .map((m) => ({
        meta: m.meta,
        centroCosto: m.centroCosto,
        fuenteFinanc: m.fuenteFinanc,
        montoCertificado: this.montoEditado(m.meta),
      }));

    if (entradas.length === 0) {
      this.snack.open('No hay metas que certificar en este período.', 'Cerrar', {
        duration: 4000,
      });
      return;
    }

    this.guardando.set(true);
    this.api.guardar(this.periodoId(), entradas).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snack.open('Certificación presupuestal registrada.', 'Cerrar', {
          duration: 4000,
        });
        this.cargar(this.periodoId());
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private cargar(id: number): void {
    this.loading.set(true);
    this.api.semaforo(id).subscribe({
      next: (data) => {
        this.semaforo.set(data);
        const montos: Record<string, number> = {};
        for (const m of data.metas) montos[m.meta] = m.montoCertificado;
        this.montos.set(montos);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
