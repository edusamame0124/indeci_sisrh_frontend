import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PersonaApiService } from '../../services/persona-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

/** Datos al abrir la ficha en `MatDialog` desde el listado. */
export interface PersonaDetailDialogData {
  readonly personaId: number;
}

/** Si el usuario pide editar desde el modal, el listado abre el formulario modal. */
export interface PersonaDetailDialogEditIntent {
  readonly action: 'edit';
  readonly personaId: number;
}

@Component({
  selector: 'app-persona-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page" [class.page--dialog]="isDialogLayout">
      @if (isDialogLayout) {
        <h2
          mat-dialog-title
          class="dlg-heading"
          tabindex="-1"
          id="sisrh-persona-detail-dlg-title"
        >
          Ficha de persona
        </h2>
      }

      @if (!isDialogLayout) {
        <nav class="crumbs" aria-label="Ubicación">
          <a mat-button routerLink="/">Inicio</a>
          <span class="crumbs__sep" aria-hidden="true">/</span>
          <a mat-button routerLink="/empleados/personas">Personas</a>
          <span class="crumbs__sep" aria-hidden="true">/</span>
          <span class="crumbs__here">Ficha</span>
        </nav>
      }

      <div class="actions">
        @if (!isDialogLayout) {
          <a mat-button routerLink="/empleados/personas">Volver al listado</a>
          @if (persona(); as p) {
            <a mat-flat-button color="primary" [routerLink]="['/empleados/personas', p.id, 'editar']">
              Editar
            </a>
            @if (p.empleadoId != null && p.empleadoId > 0) {
              <a
                mat-stroked-button
                [routerLink]="['/empleados/cuentas-bancarias/personas', p.id]"
              >
                Cuentas bancarias
              </a>
              <a mat-stroked-button [routerLink]="['/empleados/pension/personas', p.id]">
                Pensión
              </a>
              <a mat-stroked-button [routerLink]="['/empleados/planilla/personas', p.id]">
                Planilla
              </a>
              <a mat-stroked-button [routerLink]="['/empleados/puesto/personas', p.id]">
                Puesto
              </a>
            }
          }
        } @else {
          @if (persona(); as p) {
            <button mat-flat-button color="primary" type="button" (click)="onEditIntent()">
              Editar en formulario
            </button>
            @if (p.empleadoId != null && p.empleadoId > 0) {
              <a
                mat-stroked-button
                [routerLink]="['/empleados/cuentas-bancarias/personas', p.id]"
                (click)="leaveModal()"
              >
                Cuentas bancarias
              </a>
              <a
                mat-stroked-button
                [routerLink]="['/empleados/pension/personas', p.id]"
                (click)="leaveModal()"
              >
                Pensión
              </a>
              <a
                mat-stroked-button
                [routerLink]="['/empleados/planilla/personas', p.id]"
                (click)="leaveModal()"
              >
                Planilla
              </a>
              <a
                mat-stroked-button
                [routerLink]="['/empleados/puesto/personas', p.id]"
                (click)="leaveModal()"
              >
                Puesto
              </a>
            }
          }
          <button mat-button type="button" class="actions__close" (click)="closeModal()">
            Cerrar
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading" aria-busy="true">
          <mat-progress-spinner mode="indeterminate" diameter="48" aria-label="Cargando ficha" />
        </div>
      } @else if (persona(); as p) {
        <mat-card class="page-card sisrh-elevated" [class.detail-card--dlg]="isDialogLayout">
          <mat-card-header>
            <mat-card-title>{{ p.nombreCompleto }}</mat-card-title>
            <mat-card-subtitle class="doc-dni sisrh-tabular">DNI: {{ p.dni }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="grid detail-body">
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
        padding: var(--sisrh-spacing-md, 0.875rem);
        font-family: var(--sisrh-font-sans, sans-serif);
      }
      .page--dialog {
        padding: var(--sisrh-spacing-md, 0.875rem) var(--sisrh-spacing-md, 0.875rem) 0;
      }
      .dlg-heading {
        margin: 0 0 var(--sisrh-spacing-sm, 0.4375rem);
        font-family: var(--sisrh-font-heading, 'Lexend', sans-serif);
        font-size: 1rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.02em;
        padding-bottom: var(--sisrh-spacing-sm, 0.4375rem);
        border-bottom: 1px solid #e2e8f0;
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.85);
      }
      .detail-body {
        max-height: calc(88vh - 9rem);
        overflow-y: auto;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
        margin-bottom: var(--sisrh-spacing-md, 0.875rem);
      }
      .page--dialog .actions__close {
        margin-left: auto;
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
        border-radius: var(--sisrh-radius-lg, 12px);
      }
      .detail-card--dlg {
        box-shadow: none;
        border: 1px solid #e2e8f0;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      .grid p {
        margin: 0.28rem 0;
        font-size: 0.875rem;
      }
      .label {
        font-weight: 600;
        color: var(--sisrh-color-secondary, #334155);
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
  private readonly dialogShell = inject(
    MatDialogRef<PersonaDetailPageComponent, PersonaDetailDialogEditIntent | undefined>,
    { optional: true },
  );
  private readonly dialogPayload = inject<PersonaDetailDialogData | undefined>(MAT_DIALOG_DATA, {
    optional: true,
  });

  readonly isDialogLayout = this.dialogShell != null;

  readonly loading = signal(true);
  readonly persona = signal<PersonaEmpleado | null>(null);

  ngOnInit(): void {
    const dlgId = this.dialogPayload?.personaId;
    const routeIdRaw =
      dlgId != null ? String(dlgId) : this.route.snapshot.paramMap.get('id');
    const id = routeIdRaw ? Number(routeIdRaw) : NaN;
    if (!Number.isFinite(id) || id < 1) {
      this.quitOrNavigate();
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
        this.quitOrNavigate();
      },
    });
  }

  closeModal(): void {
    this.dialogShell?.close(undefined);
  }

  leaveModal(): void {
    this.dialogShell?.close(undefined);
  }

  onEditIntent(): void {
    const p = this.persona();
    if (!p) return;
    if (this.dialogShell) {
      this.dialogShell.close({ action: 'edit', personaId: p.id });
    }
  }

  /** Sale del modal si aplica; si no, vuelve al listado por ruta. */
  private quitOrNavigate(): void {
    if (this.dialogShell) {
      this.dialogShell.close(undefined);
      return;
    }
    void this.router.navigate(['/empleados/personas']);
  }
}
