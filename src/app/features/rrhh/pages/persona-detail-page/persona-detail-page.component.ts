import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

@Component({
  selector: 'app-persona-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <nav class="crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/rrhh/personas">Personas</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">Ficha</span>
      </nav>

      <div class="actions">
        <a mat-button routerLink="/rrhh/personas">Volver al listado</a>
        @if (persona(); as p) {
          <a mat-flat-button color="primary" [routerLink]="['/rrhh/personas', p.id, 'editar']">
            Editar
          </a>
          @if (p.empleadoId != null && p.empleadoId > 0) {
            <a mat-stroked-button [routerLink]="['/rrhh/cuentas-bancarias/personas', p.id]">
              Cuentas bancarias
            </a>
            <a mat-stroked-button [routerLink]="['/rrhh/pension/personas', p.id]">Pensión</a>
            <a mat-stroked-button [routerLink]="['/rrhh/planilla/personas', p.id]">Planilla</a>
            <a mat-stroked-button [routerLink]="['/rrhh/puesto/personas', p.id]">Puesto</a>
          }
        }
      </div>

      @if (loading()) {
        <div class="loading" aria-busy="true">
          <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando ficha" />
        </div>
      } @else if (persona(); as p) {
        <mat-card class="page-card sisrh-elevated">
          <mat-card-header>
            <mat-card-title>{{ p.nombreCompleto }}</mat-card-title>
            <mat-card-subtitle>DNI: {{ p.dni }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="grid">
            <p><span class="label">Correo:</span> {{ p.email }}</p>
            <p><span class="label">Teléfono:</span> {{ p.telefono ?? '—' }}</p>
            <p><span class="label">Dirección:</span> {{ p.direccion ?? '—' }}</p>
            <p><span class="label">Distrito ID:</span> {{ p.distritoId ?? '—' }}</p>
            <p><span class="label">Código interno:</span> {{ p.codigoInterno ?? '—' }}</p>
            <p><span class="label">Estado:</span> {{ p.estado ?? '—' }}</p>
          </mat-card-content>
        </mat-card>
      } @else {
        <p role="alert">No se pudo cargar el registro.</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 1rem;
        font-family: var(--sisrh-font-sans, sans-serif);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .crumbs {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.25rem;
        margin-bottom: 0.75rem;
        font-size: 0.875rem;
      }
      .crumbs__sep {
        color: #94a3b8;
      }
      .crumbs__here {
        font-weight: 600;
        color: #475569;
      }
      .page-card.sisrh-elevated {
        box-shadow:
          0 1px 2px rgb(15 23 42 / 6%),
          0 6px 20px rgb(15 23 42 / 8%);
        border-radius: 12px;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      .grid p {
        margin: 0.35rem 0;
      }
      .label {
        font-weight: 600;
        color: #334155;
        margin-right: 0.35rem;
      }
    `,
  ],
})
export class PersonaDetailPageComponent implements OnInit {
  private readonly api = inject(PersonaApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly loading = signal(true);
  readonly persona = signal<PersonaEmpleado | null>(null);

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    const id = idStr ? Number(idStr) : NaN;
    if (!Number.isFinite(id) || id < 1) {
      void this.router.navigate(['/rrhh/personas']);
      return;
    }
    this.api.obtenerPorId(id).subscribe({
      next: (p) => {
        this.persona.set(p);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error;
        const msg = isErrorResponse(body)
          ? this.errors.translate(body.mensaje)
          : this.errors.translate(null);
        this.snack.open(msg, 'Cerrar', { duration: 6000 });
        void this.router.navigate(['/rrhh/personas']);
      },
    });
  }
}
