import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { GeneradorPlanillaApiService } from '../../services/generador-planilla-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { ResumenPlanilla } from '../../models/resumen-planilla.model';

/**
 * Resumen de planilla por empleado/periodo (Spec 009 / T157 — FR-P6).
 * Muestra 3 MatCard con cifras grandes: ingresos / descuentos / neto a pagar.
 */
@Component({
  selector: 'app-resumen-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resumen-page.component.html',
  styleUrl: './resumen-page.component.css',
})
export class ResumenPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly personaApi = inject(PersonaApiService);
  private readonly generadorApi = inject(GeneradorPlanillaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly empleadoId = signal(0);
  readonly periodo = signal('');
  readonly persona = signal<PersonaEmpleado | null>(null);
  readonly resumen = signal<ResumenPlanilla | null>(null);
  readonly loading = signal(true);

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  ngOnInit(): void {
    const empIdRaw = this.route.snapshot.paramMap.get('empleadoId');
    const periodo = this.route.snapshot.paramMap.get('periodo');
    const empId = empIdRaw ? Number(empIdRaw) : NaN;
    if (!Number.isFinite(empId) || empId < 1 || !periodo) {
      void this.router.navigate(['/planilla/movimientos']);
      return;
    }
    this.empleadoId.set(empId);
    this.periodo.set(periodo);
    this.cargar(empId, periodo);
  }

  private cargar(empleadoId: number, periodo: string): void {
    this.loading.set(true);
    forkJoin({
      personas: this.personaApi.listar(),
      resumen: this.generadorApi.obtenerResumen(empleadoId, periodo),
    }).subscribe({
      next: ({ personas, resumen }) => {
        const found = personas.find((p) => p.empleadoId === empleadoId) ?? null;
        this.persona.set(found);
        this.resumen.set(resumen);
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
