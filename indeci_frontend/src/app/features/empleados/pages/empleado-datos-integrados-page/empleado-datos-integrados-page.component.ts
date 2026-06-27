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
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

import { EmpleadoPlanillaIntegradoComponent } from './components/empleado-planilla-integrado/empleado-planilla-integrado.component';
import { EmpleadoPuestoIntegradoComponent } from './components/empleado-puesto-integrado/empleado-puesto-integrado.component';
import { EmpleadoBancoIntegradoComponent } from './components/empleado-banco-integrado/empleado-banco-integrado.component';
import { EmpleadoPensionIntegradoComponent } from './components/empleado-pension-integrado/empleado-pension-integrado.component';
import { EmpleadoSaludIntegradoComponent } from './components/empleado-salud-integrado/empleado-salud-integrado.component';

@Component({
  selector: 'app-empleado-datos-integrados-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    EmpleadoPlanillaIntegradoComponent,
    EmpleadoPuestoIntegradoComponent,
    EmpleadoBancoIntegradoComponent,
    EmpleadoPensionIntegradoComponent,
    EmpleadoSaludIntegradoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page sisrh-page">
      <nav class="crumbs sisrh-crumbs" aria-label="Ubicación">
        <a mat-button routerLink="/">Inicio</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <a mat-button routerLink="/empleados/personas">Empleados</a>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <span class="crumbs__here">Datos del Empleado</span>
      </nav>

      <a mat-button routerLink="/empleados/personas" class="back-link">Volver al listado</a>

      @if (pageLoading()) {
        <div class="loading" aria-busy="true">
          <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando" />
        </div>
      } @else if (!empleadoId()) {
        <mat-card class="page-card sisrh-elevated" role="alert">
          <mat-card-content>
            <p>No hay registro de empleado vinculado a esta persona. No se pueden gestionar sus datos.</p>
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card class="header-card sisrh-elevated">
          <mat-card-header>
            <div mat-card-avatar class="header-avatar">
              <mat-icon>person</mat-icon>
            </div>
            <mat-card-title class="header-title">DATOS DEL EMPLEADO</mat-card-title>
            <mat-card-subtitle class="header-subtitle">
              <span class="emp-name">{{ persona()?.nombreCompleto }}</span>
              <span class="emp-dni">DNI: {{ persona()?.dni }}</span>
            </mat-card-subtitle>
          </mat-card-header>
        </mat-card>

        <mat-accordion class="datos-accordion" [multi]="false">
          <!-- Puesto -->
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon fontIcon="badge" class="panel-icon" /> Puesto
                @if (hasPuesto()) {
                  <mat-icon fontIcon="check_circle" class="status-icon" />
                }
              </mat-panel-title>
              <mat-panel-description>
                Cargo, nivel y ubicación física del empleado
              </mat-panel-description>
            </mat-expansion-panel-header>
            
            <app-empleado-puesto-integrado
              [empleadoId]="empleadoId()!"
              [personaId]="personaId()"
              (hasRecord)="hasPuesto.set($event)"
            />
          </mat-expansion-panel>

          <!-- Cuenta Bancaria -->
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon fontIcon="account_balance" class="panel-icon" /> Cuenta Bancaria / CCI
                @if (hasBanco()) {
                  <mat-icon fontIcon="check_circle" class="status-icon" />
                }
              </mat-panel-title>
              <mat-panel-description>
                Datos para abonos y pagos institucionales
              </mat-panel-description>
            </mat-expansion-panel-header>
            
            <app-empleado-banco-integrado
              [empleadoId]="empleadoId()!"
              [personaId]="personaId()"
              (hasRecord)="hasBanco.set($event)"
            />
          </mat-expansion-panel>

          <!-- Régimen Pensionario -->
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon fontIcon="savings" class="panel-icon" /> Régimen Pensionario
                @if (hasPension()) {
                  <mat-icon fontIcon="check_circle" class="status-icon" />
                }
              </mat-panel-title>
              <mat-panel-description>
                Régimen pensionario AFP u ONP según normativa vigente
              </mat-panel-description>
            </mat-expansion-panel-header>
            
            <app-empleado-pension-integrado
              [empleadoId]="empleadoId()!"
              [personaId]="personaId()"
              (hasRecord)="hasPension.set($event)"
            />
          </mat-expansion-panel>

          <!-- FASE 1: Configuración Remunerativa (Planilla) -->
          <mat-expansion-panel [expanded]="true">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon fontIcon="request_quote" class="panel-icon" /> Configuración Remunerativa
                @if (hasPlanilla()) {
                  <mat-icon fontIcon="check_circle" class="status-icon" />
                }
              </mat-panel-title>
              <mat-panel-description>
                Contrato, AIRHSP e ingresos del empleado
              </mat-panel-description>
            </mat-expansion-panel-header>
            <app-empleado-planilla-integrado
              [empleadoId]="empleadoId()!"
              [personaId]="personaId()"
              (hasRecord)="hasPlanilla.set($event)"
            />
          </mat-expansion-panel>

          <!-- Salud / EPS -->
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon fontIcon="health_and_safety" class="panel-icon" /> Salud / EPS
                @if (hasSalud()) {
                  <mat-icon fontIcon="check_circle" class="status-icon" />
                }
              </mat-panel-title>
              <mat-panel-description>
                Configuración de EsSalud y EPS (si aplica)
              </mat-panel-description>
            </mat-expansion-panel-header>
            
            <app-empleado-salud-integrado
              [empleadoId]="empleadoId()!"
              [personaId]="personaId()"
              (hasRecord)="hasSalud.set($event)"
            />
          </mat-expansion-panel>
        </mat-accordion>
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
      .back-link {
        margin-bottom: 1rem;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      .header-card {
        margin-bottom: 1.5rem;
        border-radius: 12px;
        background-color: var(--sisrh-color-background, #f8fafc);
      }
      .header-avatar {
        background-color: var(--sisrh-color-primary, #0369a1);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }
      .header-title {
        font-weight: 700;
        color: var(--sisrh-color-primary, #0369a1);
        font-size: 1.1rem;
      }
      .header-subtitle {
        display: flex;
        flex-direction: column;
        margin-top: 0.5rem;
      }
      .emp-name {
        font-weight: 600;
        color: var(--sisrh-text-primary, #1e293b);
        font-size: 1.05rem;
      }
      .emp-dni {
        color: var(--sisrh-text-secondary, #64748b);
      }
      .datos-accordion {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .status-icon {
        color: #16a34a;
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
        margin-left: 0.5rem;
      }
      :host ::ng-deep .datos-accordion .mat-expansion-panel-header-title {
        display: flex;
        align-items: center;
      }
      :host ::ng-deep .datos-accordion .mat-expansion-panel {
        border-radius: 8px !important;
        overflow: hidden;
      }
      :host ::ng-deep .datos-accordion .mat-expansion-panel-header {
        background-color: #f1f5f9;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0369a1);
      }
      :host ::ng-deep .datos-accordion .mat-expansion-panel-header.mat-expanded {
        background-color: #e0f2fe; /* Azul claro suave para la cabecera activa */
      }
    `,
  ],
})
export class EmpleadoDatosIntegradosPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly personaApi = inject(PersonaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly personaId = signal(0);
  readonly empleadoId = signal<number | null>(null);
  readonly persona = signal<PersonaEmpleado | null>(null);
  readonly pageLoading = signal(true);

  readonly hasPuesto = signal(false);
  readonly hasBanco = signal(false);
  readonly hasPension = signal(false);
  readonly hasPlanilla = signal(false);
  readonly hasSalud = signal(false);

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('personaId');
    const pid = idStr ? Number(idStr) : NaN;
    if (!Number.isFinite(pid) || pid < 1) {
      void this.router.navigate(['/empleados/personas']);
      return;
    }
    this.personaId.set(pid);

    this.personaApi.obtenerPorId(pid).subscribe({
      next: (p) => {
        this.persona.set(p);
        const eid = p.empleadoId != null && p.empleadoId > 0 ? p.empleadoId : null;
        this.empleadoId.set(eid);
        this.pageLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.pageLoading.set(false);
        this.onHttpFailNavigate(err);
      },
    });
  }

  private onHttpFailNavigate(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 6000 });
    void this.router.navigate(['/empleados/personas']);
  }
}
