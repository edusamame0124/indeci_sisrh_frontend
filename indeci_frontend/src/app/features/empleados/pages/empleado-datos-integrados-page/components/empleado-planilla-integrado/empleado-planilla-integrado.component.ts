import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { sisrhConfirmDialogConfig } from '../../../../../../core/config/sisrh-dialog.config';
import { ConfirmDialogComponent } from '../../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../../../shared/components/empty-state/empty-state.component';
import { EmpleadoPlanillaApiService } from '../../../../services/empleado-planilla-api.service';
import { CatalogoApiService } from '../../../../services/catalogo-api.service';
import { TipoPersonaMefApiService } from '../../../../../planilla/services/tipo-persona-mef-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { NotificacionService } from '../../../../../../core/services/notificacion.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import { padAirhspCode } from '../../../../utils/pad-airhsp-code';
import { calcIncrementosDsTotal } from '../../../../utils/calc-incrementos-ds-total';

import type { RegimenLaboral } from '../../../../../catalogos/models/regimen-laboral.model';
import type { TipoContrato } from '../../../../../catalogos/models/tipo-contrato.model';
import type { CondicionLaboral } from '../../../../../catalogos/models/condicion-laboral.model';
import type { TipoPersonaMef } from '../../../../../planilla/models/tipo-persona-mef.model';
import type { ModalidadCas } from '../../../../../catalogos/models/modalidad-cas.model';
import type { DiasNoComputablesRow, ElegibilidadVinculoRow, EmpleadoPlanillaRow, EmpleadoRemuneracionHistRow, TiempoServicioRow } from '../../../../models/empleado-planilla.model';
import type { IncrementosDsResponse } from '../../../../models/incrementos-ds.model';
import { RemuneracionCambioDialogComponent } from '../../../empleado-planilla-form-page/components/remuneracion-cambio-dialog/remuneracion-cambio-dialog.component';

import { UppercaseDirective } from '../../../../../../shared/directives/uppercase.directive';
import { IncrementosDsPanelComponent } from '../../../empleado-planilla-form-page/components/incrementos-ds-panel/incrementos-ds-panel.component';

const MONTO_INT_DIGITS = 5;
const MONTO_MAX = 99999.99;
const AIRHSP_PATTERN = /^[A-Z0-9]{6}$/;

@Component({
  selector: 'app-empleado-planilla-integrado',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatDialogModule,
    EmptyStateComponent,
    UppercaseDirective,
    IncrementosDsPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="integrado-container">
      @if (viewState() === 'list') {
        <div class="actions list-actions">
          <button
            mat-flat-button
            color="primary"
            type="button"
            [disabled]="!canRegistrar()"
            (click)="prepararNuevo()"
            [matTooltip]="
              canRegistrar()
                ? 'Registrar la configuración remunerativa del empleado'
                : 'Hay un contrato vigente. Ciérrelo con su cese para registrar uno nuevo.'
            "
          >
            <mat-icon fontIcon="add" aria-hidden="true" />
            Registrar configuración
          </button>
        </div>

        @if (tableLoading()) {
          <div class="loading" aria-busy="true">
            <mat-progress-spinner mode="indeterminate" diameter="40" aria-label="Cargando datos" />
          </div>
        } @else if (rows().length === 0) {
          <app-empty-state
            icon="receipt_long"
            title="Sin planilla activa"
            description="Este colaborador no tiene una planilla activa registrada."
          />
        } @else {
          <div class="sisrh-table-scroll">
            <table mat-table [dataSource]="pagedRows()" class="tbl">
              <ng-container matColumnDef="estadoVinculo">
                <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
                <td mat-cell *matCellDef="let row">
                  <span [class]="estadoBadgeClass(row.estadoVinculo)">
                    {{ estadoLabel(row.estadoVinculo) }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="regimen">
                <th mat-header-cell *matHeaderCellDef scope="col">Régimen</th>
                <td mat-cell *matCellDef="let row">{{ row.regimenLaboral ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="tipoContrato">
                <th mat-header-cell *matHeaderCellDef scope="col">Tipo contrato</th>
                <td mat-cell *matCellDef="let row">{{ row.tipoContrato ?? '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="condicion">
                <th mat-header-cell *matHeaderCellDef scope="col">Condición</th>
                <td mat-cell *matCellDef="let row">{{ row.condicionLaboral || row.modalidadCas || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="vigenciaVinculo">
                <th mat-header-cell *matHeaderCellDef scope="col">Vigencia</th>
                <td mat-cell *matCellDef="let row" class="col-vigencia">{{ fmtVigencia(row) }}</td>
              </ng-container>
              <ng-container matColumnDef="codigoAirhsp">
                <th mat-header-cell *matHeaderCellDef scope="col" matTooltip="Código AIRHSP">
                  Cód. AIRHSP
                </th>
                <td mat-cell *matCellDef="let row" class="sisrh-tabular col-airhsp">
                  {{ fmtAirhsp(row.registroPlazaAirhsp) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="montoContrato">
                <th mat-header-cell *matHeaderCellDef scope="col" matTooltip="Monto contrato base">
                  Monto base
                </th>
                <td mat-cell *matCellDef="let row" class="sisrh-tabular">
                  {{ fmtMoney(row.montoContrato) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="incrementosDs">
                <th mat-header-cell *matHeaderCellDef scope="col" matTooltip="Incrementos DS (total)">
                  Inc. DS
                </th>
                <td mat-cell *matCellDef="let row" class="sisrh-tabular" [matTooltip]="incrementosDsTooltip">
                  {{ fmtIncrementosDs(row) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="remuneracionMensual">
                <th mat-header-cell *matHeaderCellDef scope="col" matTooltip="Remuneración mensual">
                  Rem. mensual
                </th>
                <td mat-cell *matCellDef="let row" class="sisrh-tabular">
                  {{ fmtMoney(row.sueldoBasico) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef scope="col" class="col-sticky">Acciones</th>
                <td mat-cell *matCellDef="let row" class="col-sticky">
                  <a
                    mat-icon-button
                    (click)="prepararEdicion(row)"
                    aria-label="Editar configuración remunerativa"
                    matTooltip="Editar configuración remunerativa"
                  >
                    <mat-icon fontIcon="edit" aria-hidden="true" />
                  </a>
                  <button
                    mat-icon-button
                    type="button"
                    aria-label="Desactivar planilla"
                    matTooltip="Desactivar"
                    (click)="confirmEliminar(row)"
                  >
                    <mat-icon fontIcon="delete_outline" aria-hidden="true" />
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </div>
          <mat-paginator
            [length]="rows().length"
            [pageIndex]="pageIndex()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="pageSizeOptions"
            (page)="onPage($event)"
            showFirstLastButtons
            aria-label="Paginador de planilla"
          />
        }
      } @else {
        <!-- FORMULARIO -->
        <div class="form-header">
          <h3>{{ isEdit() ? 'Editar configuración remunerativa' : 'Nueva configuración remunerativa' }}</h3>
          <button mat-button (click)="cancelarFormulario()">Volver a la lista</button>
        </div>

        @if (formLoading()) {
          <div class="loading"><mat-progress-spinner diameter="48" mode="indeterminate" /></div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="planilla-form">
            <h4 class="section">Condiciones laborales</h4>
            <div class="grid">
              <mat-form-field appearance="outline" class="half">
                <mat-label>Régimen laboral</mat-label>
                <mat-select formControlName="regimenLaboralId" aria-required="true">
                  @for (r of regimenes(); track r.id) {
                    <mat-option [value]="r.id">{{ r.codigo }} - {{ r.nombre }}</mat-option>
                  }
                </mat-select>
                @if (form.controls.regimenLaboralId.hasError('required')) {
                  <mat-error>Requerido</mat-error>
                }
              </mat-form-field>
              
              <!-- F3.1 — Tipo persona MEF derivado del régimen (read-only). -->
              <mat-form-field appearance="outline" class="half">
                <mat-label>Tipo de persona MEF / AIRHSP</mat-label>
                <input matInput [value]="tipoPersonaMefLabel()" readonly tabindex="-1" aria-readonly="true" />
                <mat-hint>Derivado del régimen (no editable).</mat-hint>
              </mat-form-field>
            </div>

            <!-- F3 — campos/etiquetas dinámicos por régimen (no un selector universal). -->
            <div class="grid">
              @if (esRegimen276()) {
              <mat-form-field appearance="outline" class="half">
                <mat-label>Condición laboral</mat-label>
                <mat-select formControlName="condicionLaboralId">
                  <mat-option [value]="null">Sin especificar</mat-option>
                  @for (c of condicionesFiltradas(); track c.id) {
                    <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              }

              @if (esRegimenCas()) {
              <mat-form-field appearance="outline" class="half">
                <mat-label>Tipo de contrato CAS</mat-label>
                <mat-select formControlName="tipoContratoId">
                  <mat-option [value]="null">Sin especificar</mat-option>
                  @for (t of tiposContrato(); track t.id) {
                    <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
                @if (!form.controls.modalidadCasId.disabled) {
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Modalidad o causal CAS</mat-label>
                  <mat-select formControlName="modalidadCasId">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    @for (m of modalidadesCas(); track m.id) {
                      <mat-option [value]="m.id">{{ m.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                }
              }

              @if (esRegimenServir()) {
              <mat-form-field appearance="outline" class="half">
                <mat-label>Grupo de servidor civil</mat-label>
                <mat-select formControlName="grupoServidorCivil">
                  <mat-option [value]="null">Sin especificar</mat-option>
                  @for (g of GRUPOS_SERVIDOR_CIVIL; track g.valor) {
                    <mat-option [value]="g.valor">{{ g.etiqueta }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="half">
                <mat-label>¿Servidor de confianza?</mat-label>
                <mat-select formControlName="esConfianza">
                  <mat-option [value]="0">No</mat-option>
                  <mat-option [value]="1">Sí</mat-option>
                </mat-select>
              </mat-form-field>
              }

              <!-- Gate de Teletrabajo (Ley N° 31572): habilita el reporte diario. -->
              <div class="half toggle-teletrabajo">
                <mat-slide-toggle
                  color="primary"
                  [checked]="form.controls.esTeletrabajador.value === 1"
                  (change)="form.controls.esTeletrabajador.setValue($event.checked ? 1 : 0)"
                >
                  ¿Aplica a modalidad de Teletrabajo?
                </mat-slide-toggle>
                <p class="toggle-hint">
                  Actívelo solo si el servidor cuenta con resolución/adenda de teletrabajo
                  en su legajo (Ley N° 31572).
                </p>
              </div>
            </div>

            <h4 class="section">Cálculo remunerativo</h4>
            <div class="grid">
              <mat-form-field appearance="outline" class="half">
                <mat-label>Monto contrato base (S/)</mat-label>
                <input 
                  matInput 
                  formControlName="montoContratado" 
                  type="number" 
                  step="0.01" 
                  (input)="onMontoContratadoInput($event)"
                  (blur)="onMontoContratadoBlur()"
                />
                @if (form.controls.montoContratado.hasError('required')) {
                  <mat-error>Requerido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="half">
                <mat-label>Remuneración total mensual (S/)</mat-label>
                <input matInput formControlName="sueldoBasico" type="number" readonly />
              </mat-form-field>
            </div>

            <div class="grid">
              <mat-form-field appearance="outline" class="half">
                <mat-label>N° Hijos (Asignación familiar)</mat-label>
                <input matInput formControlName="numHijos" type="number" min="0" step="1" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="half">
                <mat-label>Código Plaza AIRHSP (Opcional)</mat-label>
                <input matInput formControlName="registroPlazaAirhsp" appUppercase maxlength="6" />
                <mat-hint>Últimos 6 dígitos alfanuméricos</mat-hint>
              </mat-form-field>
            </div>

            <div class="grid">
              <mat-form-field appearance="outline" class="half">
                <mat-label>Fecha de inicio (Contrato)</mat-label>
                <input matInput formControlName="fechaInicioContrato" type="date" placeholder="dd/mm/aaaa" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="half">
                <mat-label>Fecha de término</mat-label>
                <input matInput formControlName="fechaFin" type="date" placeholder="dd/mm/aaaa" />
                @if (!esPlazoDeterminado()) {
                  <mat-hint>Solo aplica a contratos a Plazo Determinado</mat-hint>
                }
              </mat-form-field>
            </div>

            <!-- SPEC_VACACIONES F2 — tiempo de servicio acumulado (read-only, base D.Leg. 1405) -->
            <div class="grid">
              <mat-form-field appearance="outline" class="half tiempo-servicio">
                <mat-label>Tiempo de servicio acumulado</mat-label>
                <input
                  matInput
                  [value]="tiempoServicioLabel()"
                  readonly
                  tabindex="-1"
                  aria-readonly="true"
                />
                @if (tiempoServicioLoading()) {
                  <mat-progress-spinner matSuffix mode="indeterminate" diameter="18" aria-hidden="true" />
                } @else {
                  <mat-icon matSuffix fontIcon="schedule" aria-hidden="true" />
                }
                <mat-hint>{{ tiempoServicioHint() }}</mat-hint>
              </mat-form-field>

              <!-- SPEC_VACACIONES F9.1 — Poka-Yoke: jornada como opciones cerradas, no texto libre. -->
              <mat-form-field appearance="outline" class="half">
                <mat-label>Jornada (récord vacacional)</mat-label>
                <mat-select formControlName="diasSemanaOperativo">
                  <mat-option [value]="null">Heredar del Régimen Laboral (Automático)</mat-option>
                  <mat-option [value]="6">Excepción: 6 días a la semana (Operativo COEN/DDI)</mat-option>
                </mat-select>
                <mat-hint>
                  {{
                    form.controls.diasSemanaOperativo.value === 6
                      ? 'Operativo: 6 días/semana → récord de 260 días.'
                      : 'Automático: hereda del régimen (por defecto 5 días → récord de 210).'
                  }}
                </mat-hint>
              </mat-form-field>
            </div>

            <!-- SPEC_VACACIONES F9.1 — días no computables (LSG/faltas), solo informativo. -->
            @if (diasNoComputables(); as dnc) {
              @if (dnc.total > 0) {
                <p class="dias-no-computables">
                  <mat-icon fontIcon="info" aria-hidden="true" />
                  Días no computables — LSG: {{ dnc.lsg }} · Faltas: {{ dnc.faltas }}
                </p>
              }
            }
            <p class="dias-no-computables__nota">
              Antigüedad para CTS/LBS. El récord vacacional (neto de LSG/faltas) se controla en el
              Padrón Vacacional.
            </p>

            <!-- F1 — estado derivado + cese del vínculo -->
            @if (estadoVinculo()) {
              <p class="vinc-estado">
                Estado del vínculo:
                <strong>{{ estadoVinculo()?.replaceAll('_', ' ') }}</strong>
                <span class="vinc-estado__hint">(derivado por el sistema, no editable)</span>
              </p>
            }

            <!-- F4a — elegibilidad calculada (solo en edición) -->
            @if (elegibilidad(); as el) {
              <div class="elegib" [class.elegib--ok]="el.elegiblePlanilla" [class.elegib--warn]="!el.elegiblePlanilla">
                <p class="elegib__head">
                  <mat-icon [fontIcon]="el.elegiblePlanilla ? 'check_circle' : 'warning'" aria-hidden="true" />
                  {{ el.elegiblePlanilla ? 'Elegible para planilla interna' : 'No elegible para planilla interna' }}
                  <span class="elegib__mcpp" [class.elegib__mcpp--ok]="el.elegibleMcpp">
                    · MCPP: {{ el.elegibleMcpp ? 'listo' : 'pendiente' }}
                  </span>
                </p>
                @if (el.pendientes.length > 0) {
                  <ul class="elegib__list">
                    @for (p of el.pendientes; track p) { <li>{{ p }}</li> }
                  </ul>
                }
              </div>
            }

            <fieldset class="cese-block">
              <legend>Cese del vínculo</legend>
              @if (!modoCese()) {
                <p class="cese-hint">
                  El cese es un acto formal que da de baja al empleado y detona la liquidación
                  (LBS). Actívelo solo cuando el trabajador deje efectivamente de laborar.
                </p>
                @if (isEdit()) {
                  <button type="button" mat-stroked-button color="warn" (click)="activarCese()">
                    <mat-icon fontIcon="logout" aria-hidden="true" />
                    Cesar / Dar de baja
                  </button>
                } @else {
                  <p class="cese-hint">El cese se registra al editar un contrato ya existente.</p>
                }
              } @else {
                <p class="cese-hint">Registre la fecha efectiva, el motivo y el documento de sustento.</p>
                <div class="grid">
                  <mat-form-field appearance="outline" class="half">
                    <mat-label>Fecha efectiva de cese</mat-label>
                    <input matInput formControlName="fechaCese" type="date" placeholder="dd/mm/aaaa" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="half">
                    <mat-label>Motivo de cese</mat-label>
                    <input matInput formControlName="motivoCese" maxlength="120"
                           placeholder="Vencimiento de contrato, renuncia, etc." />
                  </mat-form-field>
                </div>
                <div class="grid">
                  <mat-form-field appearance="outline" class="half">
                    <mat-label>Documento de sustento del cese</mat-label>
                    <input matInput formControlName="documentoCese" maxlength="200"
                           placeholder="Resolución / carta / memorando" />
                  </mat-form-field>
                </div>
                @if (habilitaLbs()) {
                  <button type="button" mat-stroked-button color="warn" (click)="onGenerarLbs()">
                    <mat-icon fontIcon="request_quote" aria-hidden="true" />
                    Generar liquidación de beneficios sociales
                  </button>
                }
              }
            </fieldset>

            <!-- F4b — Sustento del vínculo (documento de origen) -->
            <fieldset class="cese-block">
              <legend>Sustento del vínculo</legend>
              <p class="cese-hint">Documento que origina el vínculo. Los cambios posteriores (cese, cambio remunerativo) llevan su propio sustento.</p>
              <div class="grid">
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Tipo de documento</mat-label>
                  <mat-select formControlName="documentoOrigenTipo">
                    <mat-option [value]="null">Sin especificar</mat-option>
                    <mat-option value="CONTRATO">Contrato</mat-option>
                    <mat-option value="RESOLUCION">Resolución</mat-option>
                    <mat-option value="ADENDA">Adenda</mat-option>
                    <mat-option value="DESIGNACION">Designación</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="half">
                  <mat-label>N° de documento</mat-label>
                  <input matInput formControlName="documentoOrigenNumero" maxlength="60"
                         placeholder="CAS-2026-00125" />
                </mat-form-field>
              </div>
              <div class="grid">
                <mat-form-field appearance="outline" class="half">
                  <mat-label>Fecha del documento</mat-label>
                  <input matInput formControlName="documentoOrigenFecha" type="date" placeholder="dd/mm/aaaa" />
                </mat-form-field>
              </div>
            </fieldset>

            <!-- F2 — historial remunerativo (solo en edición) -->
            @if (isEdit()) {
              <fieldset class="hist-block">
                <legend>Historial remunerativo</legend>
                <p class="cese-hint">La planilla usa la remuneración vigente en el período que procesa.</p>
                @if (historial().length > 0) {
                  <table mat-table [dataSource]="historial()" class="hist-table">
                    <ng-container matColumnDef="vigencia">
                      <th mat-header-cell *matHeaderCellDef scope="col">Vigencia</th>
                      <td mat-cell *matCellDef="let h">{{ h.vigenciaDesde }} — {{ h.vigenciaHasta ?? 'Vigente' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="remuneracion">
                      <th mat-header-cell *matHeaderCellDef scope="col">Remuneración total</th>
                      <td mat-cell *matCellDef="let h">S/ {{ h.remuneracionTotal }}</td>
                    </ng-container>
                    <ng-container matColumnDef="tipo">
                      <th mat-header-cell *matHeaderCellDef scope="col">Motivo</th>
                      <td mat-cell *matCellDef="let h">{{ h.tipoCambio ?? '—' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="fuente">
                      <th mat-header-cell *matHeaderCellDef scope="col">Fuente</th>
                      <td mat-cell *matCellDef="let h">{{ h.fuente ?? '—' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="estado">
                      <th mat-header-cell *matHeaderCellDef scope="col">Estado</th>
                      <td mat-cell *matCellDef="let h">{{ h.estado ?? '—' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="acciones">
                      <th mat-header-cell *matHeaderCellDef scope="col"></th>
                      <td mat-cell *matCellDef="let h">
                        <button mat-icon-button type="button" color="warn"
                                (click)="onEliminarCambio(h)"
                                matTooltip="Eliminar cambio remunerativo"
                                [attr.aria-label]="'Eliminar vigencia desde ' + h.vigenciaDesde">
                          <mat-icon fontIcon="delete" />
                        </button>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="historialCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: historialCols"></tr>
                  </table>
                } @else {
                  <p class="cese-hint">Sin cambios remunerativos registrados.</p>
                }
                <button type="button" mat-stroked-button color="primary" (click)="abrirRegistrarCambio()">
                  <mat-icon fontIcon="add" aria-hidden="true" />
                  Registrar cambio remunerativo
                </button>
              </fieldset>
            }

            @if (incrementosDs()) {
              <app-incrementos-ds-panel 
                [incrementos]="incrementosDs()"
                [montoContratado]="form.controls.montoContratado.value"
              />
            }

            <div class="actions">
              <button
                mat-flat-button
                color="primary"
                type="submit"
                [disabled]="form.invalid || saving()"
              >
                Guardar Configuración
              </button>
            </div>
          </form>
        }
      }
    </div>
  `,
  styles: [
    `
      /* Gate de Teletrabajo (Ley N° 31572) */
      .toggle-teletrabajo {
        display: flex;
        flex-direction: column;
        gap: 4px;
        justify-content: center;
        padding: 4px 0;
      }
      .toggle-teletrabajo .toggle-hint {
        margin: 0;
        font-size: 12px;
        color: var(--sisrh-text-muted, #64748b);
        line-height: 1.35;
      }
      /* F1/F2 — estado del vínculo, cese e historial remunerativo */
      .vinc-estado {
        margin: 4px 0 8px;
        font-size: 13px;
        color: var(--sisrh-text, #334155);
      }
      .vinc-estado__hint {
        margin-left: 6px;
        font-size: 11px;
        color: var(--sisrh-text-soft, #94a3b8);
      }
      .cese-block, .hist-block {
        margin: 8px 0;
        padding: 12px 16px;
        border: 1px solid var(--sisrh-border, #d9e1ea);
        border-radius: 8px;
      }
      .cese-block legend, .hist-block legend {
        font-size: 13px;
        font-weight: 700;
        color: var(--sisrh-text, #334155);
        padding: 0 6px;
      }
      .cese-hint {
        margin: 0 0 8px;
        font-size: 12px;
        color: var(--sisrh-text-muted, #64748b);
      }
      .hist-table {
        width: 100%;
        margin-bottom: 8px;
      }
      .hist-table th {
        background: var(--sisrh-surface-muted, #f8fafc);
        font-weight: 600;
      }
      /* F4a — panel de elegibilidad */
      .elegib {
        margin: 8px 0;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid var(--sisrh-border, #d9e1ea);
        font-size: 13px;
      }
      .elegib--ok { background: #e7f5ee; border-color: #a7d8bf; }
      .elegib--warn { background: #fff4db; border-color: #f0d9a7; }
      .elegib__head {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        font-weight: 700;
        color: var(--sisrh-text, #334155);
      }
      .elegib__mcpp { font-weight: 500; color: var(--sisrh-warning, #b7791f); }
      .elegib__mcpp--ok { color: var(--sisrh-success, #157347); }
      .elegib__list { margin: 6px 0 0 18px; color: var(--sisrh-text-muted, #64748b); }
      .integrado-container {
        padding: 0.5rem 0;
      }
      .list-actions {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }
      .form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
      }
      .form-header h3 {
        margin: 0;
        color: var(--sisrh-color-primary, #0f172a);
        font-size: 1.1rem;
      }
      .loading {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      .tbl {
        width: 100%;
      }
      .col-airhsp {
        font-family: var(--sisrh-font-mono, ui-monospace, monospace);
      }
      .col-vigencia {
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
        color: #475569;
      }
      .badge {
        display: inline-block;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1.4;
        white-space: nowrap;
      }
      .badge--success {
        background: var(--sisrh-success-100, #e7f5ee);
        color: var(--sisrh-success, #157347);
      }
      .badge--neutral {
        background: #eef2f7;
        color: #475569;
      }
      .badge--info {
        background: var(--sisrh-info-100, #eaf2fb);
        color: var(--sisrh-info, #2563a6);
      }
      .badge--warning {
        background: var(--sisrh-warning-100, #fff4db);
        color: var(--sisrh-warning, #b7791f);
      }
      .badge--danger {
        background: var(--sisrh-danger-100, #fdecec);
        color: var(--sisrh-danger, #b42318);
      }
      .col-sticky {
        position: sticky;
        right: 0;
        background: #fff;
        z-index: 1;
        box-shadow: -4px 0 8px rgb(15 23 42 / 4%);
      }
      .section {
        margin: 1.5rem 0 0.75rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--sisrh-text-primary, #1b1b1b);
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        padding-bottom: 0.25rem;
      }
      .section:first-of-type {
        margin-top: 0;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      @media (max-width: 600px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }
      .half {
        width: 100%;
      }
      /* SPEC_VACACIONES F2 — campo derivado (read-only) con acento sutil institucional. */
      .tiempo-servicio input {
        font-weight: 600;
        color: var(--sisrh-text, #334155);
        font-variant-numeric: tabular-nums;
      }
      .tiempo-servicio mat-icon[matSuffix] {
        color: var(--sisrh-info, #2563a6);
      }
      /* SPEC_VACACIONES F9.1 — días no computables (LSG/faltas), informativo. */
      .dias-no-computables {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin: 0.25rem 0 0;
        padding: 0.4rem 0.65rem;
        background: #fef3c7;
        border: 1px solid #fcd34d;
        color: #92400e;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 600;
      }
      .dias-no-computables mat-icon {
        font-size: 1.1rem;
        width: 1.1rem;
        height: 1.1rem;
      }
      .dias-no-computables__nota {
        margin: 0.25rem 0 0;
        font-size: 0.72rem;
        color: #64748b;
        line-height: 1.4;
      }
      .actions {
        margin-top: 1rem;
      }
    `,
  ],
})
export class EmpleadoPlanillaIntegradoComponent implements OnInit {
  readonly empleadoId = input.required<number>();
  readonly personaId = input.required<number>();
  readonly hasRecord = output<boolean>();

  private readonly planillaApi = inject(EmpleadoPlanillaApiService);
  private readonly catalogoApi = inject(CatalogoApiService);
  private readonly tipoPersonaMefApi = inject(TipoPersonaMefApiService);
  private readonly fb = inject(FormBuilder);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly notif = inject(NotificacionService);
  private readonly errors = inject(ErrorMessageService);

  // STATE: list vs form
  readonly viewState = signal<'list' | 'form'>('list');
  readonly isEdit = signal(false);
  readonly editId = signal<number | null>(null);

  // LIST STATE
  readonly rows = signal<readonly EmpleadoPlanillaRow[]>([]);
  readonly tableLoading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 20] as const;
  readonly columns = [
    'estadoVinculo',
    'regimen',
    'tipoContrato',
    'condicion',
    'vigenciaVinculo',
    'codigoAirhsp',
    'montoContrato',
    'incrementosDs',
    'remuneracionMensual',
    'acciones',
  ] as const;
  readonly incrementosDsTooltip = 'Suma de incrementos DS de negociación colectiva. Detalle en Editar.';

  readonly pagedRows = computed(() => {
    const list = this.rows();
    const start = this.pageIndex() * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });
  /**
   * Vínculos secuenciales: registrar un contrato nuevo siempre está disponible. Si ya hay
   * uno vigente, el backend lo cierra automáticamente (un solo vínculo vigente, SERVIR/MEF);
   * el usuario lo confirma en {@link submit} antes del POST. Los cesados quedan en historial.
   */
  readonly canRegistrar = computed(() => this.empleadoId() != null);
  /** true si hay un contrato vigente (sin cese) que se cerraría al registrar uno nuevo. */
  readonly hayVigenteSinCese = computed(() => this.rows().some((r) => r.fechaCese == null));

  /** Código del tipo de contrato seleccionado (para gobernar la Fecha de término). */
  readonly tipoContratoCodigo = signal<string>('');
  /** La Fecha de término solo aplica a Plazo Determinado (regla de dominio RR.HH.). */
  readonly esPlazoDeterminado = computed(() => this.tipoContratoCodigo() === 'PLAZO_DETERMINADO');
  /** El cese es un acto formal: los campos de cese solo se habilitan al "Cesar / Dar de baja". */
  readonly modoCese = signal(false);

  // FORM STATE
  readonly formLoading = signal(false);
  readonly saving = signal(false);
  readonly incrementosDs = signal<IncrementosDsResponse | null>(null);
  
  readonly regimenes = signal<readonly RegimenLaboral[]>([]);
  readonly tiposContrato = signal<readonly TipoContrato[]>([]);
  readonly condiciones = signal<readonly CondicionLaboral[]>([]);
  readonly tiposPersonaMef = signal<readonly TipoPersonaMef[]>([]);
  readonly modalidadesCas = signal<readonly ModalidadCas[]>([]);

  readonly form = this.fb.group({
    regimenLaboralId: this.fb.control<number | null>(null, [Validators.required]),
    tipoContratoId: this.fb.control<number | null>(null),
    condicionLaboralId: this.fb.control<number | null>(null),
    modalidadCasId: this.fb.control<number | null>(null),
    // Ley 30057 (F3)
    grupoServidorCivil: this.fb.control<string | null>(null),
    esConfianza: this.fb.control<number>(0),
    // Gate de Teletrabajo (Ley N° 31572, V012_28): habilitación por RR.HH.
    esTeletrabajador: this.fb.control<number>(0),
    montoContratado: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(MONTO_MAX),
    ]),
    sueldoBasico: this.fb.control<number | null>({ value: null, disabled: true }, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(MONTO_MAX),
    ]),
    numHijos: this.fb.control<number | null>(null, [Validators.min(0)]),
    tipoPersonaMefId: this.fb.control<number | null>(null),
    registroPlazaAirhsp: this.fb.control<string>('', [
      Validators.pattern(AIRHSP_PATTERN),
      Validators.maxLength(6),
    ]),
    fechaInicioContrato: this.fb.control<string | null>(null),
    // SPEC_VACACIONES F9.1 — override de jornada (null=hereda régimen; 6=operativo COEN/DDI).
    diasSemanaOperativo: this.fb.control<number | null>(null),
    // Cese (F1): si hay fechaCese, motivo y documento son obligatorios.
    fechaFin: this.fb.control<string | null>(null),
    fechaCese: this.fb.control<string | null>(null),
    motivoCese: this.fb.control<string | null>(null),
    documentoCese: this.fb.control<string | null>(null),
    // Sustento del vínculo (F4b)
    documentoOrigenTipo: this.fb.control<string | null>(null),
    documentoOrigenNumero: this.fb.control<string | null>(null),
    documentoOrigenFecha: this.fb.control<string | null>(null),
  });

  // SPEC_VACACIONES F2 — tiempo de servicio acumulado (read-only, base D.Leg. 1405).
  readonly tiempoServicio = signal<TiempoServicioRow | null>(null);
  readonly tiempoServicioLoading = signal(false);
  // SPEC_VACACIONES F9.1 — días no computables (LSG/faltas) informativos en Config Remunerativa.
  readonly diasNoComputables = signal<DiasNoComputablesRow | null>(null);
  readonly tiempoServicioSinVinculo = signal(false);

  readonly tiempoServicioLabel = computed(() => {
    if (this.tiempoServicioLoading()) return 'Calculando…';
    if (this.tiempoServicioSinVinculo()) return 'Sin vínculo registrado';
    const t = this.tiempoServicio();
    if (!t) return '—';
    const partes: string[] = [];
    if (t.anios) partes.push(`${t.anios} ${t.anios === 1 ? 'año' : 'años'}`);
    if (t.meses) partes.push(`${t.meses} ${t.meses === 1 ? 'mes' : 'meses'}`);
    partes.push(`${t.dias} ${t.dias === 1 ? 'día' : 'días'}`);
    return partes.join(', ');
  });

  readonly tiempoServicioHint = computed(() => {
    if (this.tiempoServicioSinVinculo()) {
      return 'El empleado aún no tiene un contrato registrado.';
    }
    const t = this.tiempoServicio();
    if (!t) return 'Calculado del historial de contratos (D.Leg. 1405). No editable.';
    const corte = t.fechaCorte ? ` al ${this.fmtDate(t.fechaCorte)}` : '';
    const traslape = t.tieneTraslape ? ' · contratos traslapados fusionados' : '';
    return `Acumulado de ${t.numVinculos} contrato(s)${corte} (base 30/360, D.Leg. 1405)${traslape}. No editable.`;
  });

  // F1 — estado derivado + LBS ; F2 — historial ; F4 — elegibilidad.
  readonly estadoVinculo = signal<string | null>(null);
  readonly habilitaLbs = signal<boolean>(false);
  readonly elegibilidad = signal<ElegibilidadVinculoRow | null>(null);
  readonly historial = signal<readonly EmpleadoRemuneracionHistRow[]>([]);
  readonly historialCols = ['vigencia', 'remuneracion', 'tipo', 'fuente', 'estado', 'acciones'] as const;

  // F3 — campos/etiquetas dinámicos por régimen.
  readonly GRUPOS_SERVIDOR_CIVIL = [
    { valor: 'FUNCIONARIO', etiqueta: 'Funcionario público' },
    { valor: 'DIRECTIVO', etiqueta: 'Directivo público' },
    { valor: 'CARRERA', etiqueta: 'Servidor civil de carrera' },
    { valor: 'ACTIVIDADES_COMPLEMENTARIAS', etiqueta: 'Actividades complementarias' },
  ] as const;

  /** Señal reactiva del código de régimen (se actualiza en evaluarRegimen). */
  readonly regimenCodigoSignal = signal<string>('');
  readonly esRegimen276 = computed(() => this.regimenCodigoSignal() === '276');
  readonly esRegimenCas = computed(() => this.regimenCodigoSignal() === '1057');
  readonly esRegimenServir = computed(() => this.regimenCodigoSignal() === '30057');

  readonly condicionesFiltradas = computed(() =>
    this.condiciones().filter((c) => {
      const cod = `${c.codigo ?? ''} ${c.nombre ?? ''}`.toUpperCase();
      return cod.includes('NOMBRADO') || cod.includes('CONTRATADO');
    }),
  );

  // F3.1 — Tipo persona MEF derivado del régimen (read-only).
  private readonly REGIMEN_A_TIPO_PERSONA_MEF: Record<string, string> = {
    '1057': '4', '276': '1', '30057': '1', 'FORMATIVA': '6',
  };
  readonly tipoPersonaMefLabel = computed(() => {
    const cod = this.REGIMEN_A_TIPO_PERSONA_MEF[this.regimenCodigoSignal()];
    return this.tiposPersonaMef().find((t) => t.codigo === cod)?.nombre ?? '—';
  });

  private readonly moneyFmt = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  constructor() {
    merge(
      this.form.controls.regimenLaboralId.valueChanges,
      this.form.controls.condicionLaboralId.valueChanges,
    )
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.recalcularIncrementos());

    this.form.controls.regimenLaboralId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.evaluarRegimen(id));

    this.form.controls.tipoContratoId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        this.evaluarModalidadCas(this.form.controls.regimenLaboralId.value, id);
        this.aplicarReglaFechaTermino(id);
      });
  }

  /**
   * La Fecha de término (fechaFin) solo aplica a Plazo Determinado. En cualquier otro tipo se
   * limpia y se deshabilita el campo (el backend también la fuerza a null).
   */
  private aplicarReglaFechaTermino(tipoContratoId: number | null): void {
    const codigo = this.tiposContrato().find((t) => t.id === tipoContratoId)?.codigo ?? '';
    this.tipoContratoCodigo.set(codigo);
    const fechaFin = this.form.controls.fechaFin;
    if (codigo === 'PLAZO_DETERMINADO') {
      fechaFin.enable({ emitEvent: false });
    } else {
      fechaFin.setValue(null, { emitEvent: false });
      fechaFin.disable({ emitEvent: false });
    }
  }

  /** Acción explícita "Cesar / Dar de baja": habilita los campos de cese. */
  activarCese(): void {
    this.modoCese.set(true);
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.loadList();
    this.cargarTiempoServicio();
  }

  /** SPEC_VACACIONES F2 — consume el endpoint F1 (tiempo de servicio acumulado). */
  private cargarTiempoServicio(): void {
    this.tiempoServicioLoading.set(true);
    this.tiempoServicioSinVinculo.set(false);
    this.planillaApi.obtenerTiempoServicio(this.empleadoId()).subscribe({
      next: (t) => {
        this.tiempoServicio.set(t);
        this.tiempoServicioLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tiempoServicioLoading.set(false);
        this.tiempoServicio.set(null);
        // 404 = empleado sin vínculo activo aún (no es un error de la pantalla).
        this.tiempoServicioSinVinculo.set(err.status === 404);
      },
    });

    // SPEC_VACACIONES F9.1 — días no computables (LSG/faltas), solo informativo aquí.
    // El récord vacacional (efecto real) se controla en el Padrón Vacacional.
    this.planillaApi.obtenerTiempoServicioDetalle(this.empleadoId()).subscribe({
      next: (d) => this.diasNoComputables.set(d.diasNoComputables),
      error: () => this.diasNoComputables.set(null),
    });
  }

  // --- LIST METHODS ---
  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
  }

  private loadList(): void {
    this.tableLoading.set(true);
    this.planillaApi.listar(this.empleadoId()).subscribe({
      next: (list) => {
        this.rows.set(list);
        this.hasRecord.emit(list.length > 0);
        this.clampPageIndex(list.length);
        this.tableLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.tableLoading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private clampPageIndex(total: number): void {
    const ps = this.pageSize();
    const maxIdx = total > 0 ? Math.max(0, Math.ceil(total / ps) - 1) : 0;
    if (this.pageIndex() > maxIdx) this.pageIndex.set(maxIdx);
  }

  confirmEliminar(row: EmpleadoPlanillaRow): void {
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Desactivar planilla',
        message: 'Se desactivará el registro de planilla y dejará de considerarse vigente. ¿Continuar?',
        confirmLabel: 'Desactivar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok === true) this.eliminar(row.id);
    });
  }

  private eliminar(id: number): void {
    this.planillaApi.eliminar(id).subscribe({
      next: () => {
        this.snack.open('Planilla desactivada correctamente.', 'Cerrar', { duration: 4000 });
        this.loadList();
      },
      error: (err: HttpErrorResponse) => this.onHttpSnack(err),
    });
  }

  fmtMoney(value: number | null): string {
    if (value == null || Number.isNaN(value)) return '—';
    return this.moneyFmt.format(value);
  }

  estadoLabel(estado: string | null): string {
    switch (estado) {
      case 'VIGENTE':
        return 'Vigente';
      case 'CESADO':
        return 'Cesado';
      case 'PROGRAMADO':
        return 'Programado';
      case 'VENCIDO_PENDIENTE_DE_REGULARIZACION':
        return 'Vencido';
      case 'ANULADO':
        return 'Anulado';
      default:
        return '—';
    }
  }

  estadoBadgeClass(estado: string | null): string {
    switch (estado) {
      case 'VIGENTE':
        return 'badge badge--success';
      case 'CESADO':
        return 'badge badge--neutral';
      case 'PROGRAMADO':
        return 'badge badge--info';
      case 'VENCIDO_PENDIENTE_DE_REGULARIZACION':
        return 'badge badge--warning';
      case 'ANULADO':
        return 'badge badge--danger';
      default:
        return 'badge badge--neutral';
    }
  }

  private fmtDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
  }

  fmtVigencia(row: EmpleadoPlanillaRow): string {
    const inicio = this.fmtDate(row.fechaInicioContrato);
    const fin = this.fmtDate(row.fechaCese ?? row.fechaFin);
    if (!inicio && !fin) return '—';
    return `${inicio || '—'} – ${fin || 'vigente'}`;
  }

  fmtAirhsp(value: string | null): string {
    if (value == null || value.trim() === '') return '—';
    return value;
  }

  fmtIncrementosDs(row: EmpleadoPlanillaRow): string {
    const total = calcIncrementosDsTotal(row.sueldoBasico, row.montoContrato);
    if (total == null) return '—';
    return this.moneyFmt.format(total);
  }

  // --- FORM METHODS ---
  private cargarCatalogos(): void {
    this.catalogoApi.listarRegimenesLaborales().subscribe({
      next: (list) => {
        const filtrados = list.filter((r) => r.codigo !== '728' && r.codigo !== '9999');
        this.regimenes.set(filtrados);
        this.evaluarRegimen(this.form.controls.regimenLaboralId.value);
      },
    });
    this.catalogoApi.listarTiposContrato().subscribe({
      next: (list) => {
        this.tiposContrato.set(list);
        this.evaluarModalidadCas(this.form.controls.regimenLaboralId.value, this.form.controls.tipoContratoId.value);
      },
    });
    this.catalogoApi.listarCondicionesLaborales().subscribe({
      next: (list) => {
        this.condiciones.set(list);
        this.evaluarRegimen(this.form.controls.regimenLaboralId.value);
      },
    });
    this.tipoPersonaMefApi.listarActivos().subscribe({
      next: (list) => {
        this.tiposPersonaMef.set(list);
        this.derivarTipoPersonaMef();
      },
    });
    this.catalogoApi.listarModalidadesCas().subscribe({
      next: (list) => this.modalidadesCas.set(list),
    });
  }

  private evaluarRegimen(regimenId: number | null): void {
    const reg = this.regimenes().find((r) => r.id === regimenId);
    this.regimenCodigoSignal.set(reg?.codigo ?? '');
    this.derivarTipoPersonaMef();
    if (!reg) return;

    if (reg.codigo === '1057') {
      this.form.controls.condicionLaboralId.setValue(null, { emitEvent: false });
      this.form.controls.condicionLaboralId.disable();
      this.form.controls.tipoContratoId.enable();
      this.evaluarModalidadCas(regimenId, this.form.controls.tipoContratoId.value);
    } else if (reg.codigo === '276') {
      this.form.controls.tipoContratoId.setValue(null);
      this.form.controls.tipoContratoId.disable();
      this.form.controls.condicionLaboralId.enable();
      this.form.controls.modalidadCasId.setValue(null);
      this.form.controls.modalidadCasId.disable();
    } else {
      this.form.controls.tipoContratoId.enable();
      this.form.controls.condicionLaboralId.enable();
      this.form.controls.modalidadCasId.setValue(null);
      this.form.controls.modalidadCasId.disable();
    }
  }

  private evaluarModalidadCas(regimenId: number | null, tipoContratoId: number | null): void {
    const reg = this.regimenes().find((r) => r.id === regimenId);
    const tc = this.tiposContrato().find((t) => t.id === tipoContratoId);
    
    if (reg?.codigo === '1057' && tc?.codigo === 'PLAZO_DETERMINADO') {
      this.form.controls.modalidadCasId.enable();
    } else {
      this.form.controls.modalidadCasId.setValue(null);
      this.form.controls.modalidadCasId.disable();
    }
  }

  /** F3.1 — fija el tipoPersonaMefId derivado del régimen. */
  private derivarTipoPersonaMef(): void {
    const cod = this.REGIMEN_A_TIPO_PERSONA_MEF[this.regimenCodigoSignal()];
    const item = cod ? this.tiposPersonaMef().find((t) => t.codigo === cod) : undefined;
    this.form.controls.tipoPersonaMefId.setValue(item?.id ?? null, { emitEvent: false });
  }

  private cargarHistorial(planillaId: number): void {
    this.planillaApi.listarRemuneracionHist(planillaId).subscribe({
      next: (rows) => this.historial.set(rows),
      error: () => this.historial.set([]),
    });
  }

  private cargarElegibilidad(planillaId: number): void {
    this.planillaApi.obtenerElegibilidad(planillaId).subscribe({
      next: (e) => this.elegibilidad.set(e),
      error: () => this.elegibilidad.set(null),
    });
  }

  abrirRegistrarCambio(): void {
    const planillaId = this.editId();
    if (planillaId == null) {
      this.notif.exito('Guarde la vinculación antes de registrar cambios remunerativos.');
      return;
    }
    const ref = this.dialogs.open(RemuneracionCambioDialogComponent, { width: '480px', maxWidth: '95vw' });
    ref.afterClosed().subscribe((input) => {
      if (!input) return;
      this.planillaApi.registrarCambioRemunerativo(planillaId, input).subscribe({
        next: () => {
          this.notif.exito('Cambio remunerativo registrado.');
          this.cargarHistorial(planillaId);
        },
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
    });
  }

  onEliminarCambio(h: EmpleadoRemuneracionHistRow): void {
    const planillaId = this.editId();
    if (planillaId == null) return;
    const ref = this.dialogs.open(
      ConfirmDialogComponent,
      sisrhConfirmDialogConfig({
        title: 'Eliminar cambio remunerativo',
        message: `Se eliminará la vigencia desde ${h.vigenciaDesde} (S/ ${h.remuneracionTotal}). La vigencia anterior se reabrirá para cubrir el período. ¿Continuar?`,
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        severity: 'danger',
      }),
    );
    void ref.afterClosed().subscribe((ok: boolean | undefined) => {
      if (ok !== true) return;
      this.planillaApi.eliminarCambioRemunerativo(planillaId, h.id).subscribe({
        next: () => {
          this.notif.exito('Cambio remunerativo eliminado.');
          this.cargarHistorial(planillaId);
        },
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
    });
  }

  onGenerarLbs(): void {
    this.notif.exito(
      'La Liquidación de Beneficios Sociales se generará en el módulo de Liquidaciones (en implementación).',
    );
  }

  prepararNuevo(): void {
    if (!this.canRegistrar()) return;
    this.isEdit.set(false);
    this.editId.set(null);
    this.modoCese.set(false); // un contrato nuevo nunca nace cesado
    this.tipoContratoCodigo.set('');
    this.form.reset({ regimenLaboralId: null, tipoContratoId: null, condicionLaboralId: null, modalidadCasId: null, grupoServidorCivil: null, esConfianza: 0, esTeletrabajador: 0, montoContratado: null, sueldoBasico: null, numHijos: null, tipoPersonaMefId: null, registroPlazaAirhsp: '', fechaInicioContrato: null, diasSemanaOperativo: null, fechaFin: null, fechaCese: null, motivoCese: null, documentoCese: null, documentoOrigenTipo: null, documentoOrigenNumero: null, documentoOrigenFecha: null });
    this.estadoVinculo.set(null);
    this.habilitaLbs.set(false);
    this.historial.set([]);
    this.elegibilidad.set(null);
    this.regimenCodigoSignal.set('');
    this.viewState.set('form');
  }

  prepararEdicion(row: EmpleadoPlanillaRow): void {
    this.isEdit.set(true);
    this.editId.set(row.id);
    // Si el contrato ya está cesado, se muestran sus datos de cese; si está vigente, los
    // campos de cese quedan ocultos hasta que el usuario pulse "Cesar / Dar de baja".
    this.modoCese.set((row as { fechaCese?: string | null }).fechaCese != null);
    this.viewState.set('form');
    this.formLoading.set(true);
    
    // Simulate API fetch delay to patch form properly or fetch fresh data if needed.
    // Since we have the row, we can patch directly.
    const montoContratado = row.montoContrato ?? row.sueldoBasico;
    this.form.patchValue({
      regimenLaboralId: row.regimenLaboralId,
      tipoContratoId: row.tipoContratoId,
      condicionLaboralId: row.condicionLaboralId,
      modalidadCasId: (row as any).modalidadCasId ?? null,
      grupoServidorCivil: (row as any).grupoServidorCivil ?? null,
      esConfianza: (row as any).esConfianza ?? 0,
      esTeletrabajador: (row as any).esTeletrabajador ?? 0,
      montoContratado,
      sueldoBasico: row.sueldoBasico,
      numHijos: row.numHijos,
      tipoPersonaMefId: (row as any).tipoPersonaMefId ?? null,
      registroPlazaAirhsp: (row as any).registroPlazaAirhsp ?? '',
      fechaInicioContrato: (row as any).fechaInicioContrato ?? null,
      diasSemanaOperativo: (row as any).diasSemanaOperativo ?? null,
      fechaFin: (row as any).fechaFin ?? null,
      fechaCese: (row as any).fechaCese ?? null,
      motivoCese: (row as any).motivoCese ?? null,
      documentoCese: (row as any).documentoCese ?? null,
      documentoOrigenTipo: (row as any).documentoOrigenTipo ?? null,
      documentoOrigenNumero: (row as any).documentoOrigenNumero ?? null,
      documentoOrigenFecha: (row as any).documentoOrigenFecha ?? null,
    });
    this.regimenCodigoSignal.set(
      this.regimenes().find((r) => r.id === row.regimenLaboralId)?.codigo ?? '',
    );
    this.estadoVinculo.set((row as any).estadoVinculo ?? null);
    this.habilitaLbs.set(Boolean((row as any).habilitaLbs));
    this.cargarHistorial(row.id);
    this.cargarElegibilidad(row.id);
    this.recalcularIncrementos();
    this.formLoading.set(false);
  }

  cancelarFormulario(): void {
    this.viewState.set('list');
  }

  onMontoContratadoInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input || input.value === '') return;
    const raw = input.value;
    const [intPart = '', decPart] = raw.split('.');
    const cappedInt = intPart.slice(0, MONTO_INT_DIGITS);
    const cappedDec = decPart != null ? decPart.slice(0, 2) : undefined;
    const cleaned = cappedDec !== undefined ? `${cappedInt}.${cappedDec}` : cappedInt;
    if (raw !== cleaned) {
      const num = cleaned === '' || cleaned === '.' ? null : Number(cleaned);
      this.form.controls.montoContratado.setValue(Number.isFinite(num as number) ? (num as number) : null);
    }
  }

  onMontoContratadoBlur(): void {
    this.recalcularIncrementos();
  }

  recalcularIncrementos(): void {
    const regimenId = this.form.controls.regimenLaboralId.value;
    const monto = this.form.controls.montoContratado.value;
    if (regimenId == null || monto == null || monto < 0.01) {
      this.incrementosDs.set(null);
      return;
    }

    this.planillaApi
      .calcularIncrementosDs({
        regimenLaboralId: regimenId,
        condicionLaboralId: this.form.controls.condicionLaboralId.value,
        montoContratado: monto,
      })
      .subscribe({
        next: (resp) => {
          this.incrementosDs.set(resp);
          this.form.controls.sueldoBasico.setValue(resp.remuneracionMensual);
        },
        error: () => this.incrementosDs.set(null),
      });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (v.sueldoBasico == null || v.montoContratado == null) return;
    if (v.regimenLaboralId == null) return;

    // Cese (F1): si hay fecha de cese, motivo y documento son obligatorios.
    if (v.fechaCese && (!v.motivoCese?.trim() || !v.documentoCese?.trim())) {
      this.notif.exito('Para registrar el cese indique fecha, motivo y documento de sustento.');
      return;
    }

    const body = {
      empleadoId: this.empleadoId(),
      codigoAirhsp: '000000',
      montoContrato: v.montoContratado,
      sueldoBasico: v.sueldoBasico,
      tieneAsignacionFamiliar: (v.numHijos ?? 0) > 0 ? 1 : 0,
      numHijos: v.numHijos ?? undefined,
      regimenLaboralId: v.regimenLaboralId,
      tipoContratoId: v.tipoContratoId ?? null,
      condicionLaboralId: v.condicionLaboralId ?? null,
      modalidadCasId: v.modalidadCasId ?? null,
      grupoServidorCivil: v.grupoServidorCivil ?? null,
      esConfianza: v.esConfianza ?? 0,
      esTeletrabajador: v.esTeletrabajador ?? 0,
      tipoPersonaMefId: v.tipoPersonaMefId ?? null,
      registroPlazaAirhsp: v.registroPlazaAirhsp ?? '',
      fechaInicioContrato: v.fechaInicioContrato ?? null,
      diasSemanaOperativo: v.diasSemanaOperativo ?? null,
      fechaFin: v.fechaFin ?? null,
      fechaCese: v.fechaCese ?? null,
      motivoCese: v.motivoCese?.trim() || null,
      documentoCese: v.documentoCese?.trim() || null,
      documentoOrigenTipo: v.documentoOrigenTipo ?? null,
      documentoOrigenNumero: v.documentoOrigenNumero?.trim() || null,
      documentoOrigenFecha: v.documentoOrigenFecha ?? null,
    };

    this.saving.set(true);
    if (this.isEdit()) {
      const id = this.editId();
      if (!id) return;
      this.planillaApi.actualizar(id, body).subscribe({
        next: () => this.onSaved('Planilla actualizada.'),
        error: (err: HttpErrorResponse) => this.onSaveErr(err),
      });
      return;
    }
    
    // Un solo vínculo vigente (SERVIR/MEF): si ya hay un contrato vigente, registrar uno nuevo
    // cerrará el anterior. Se confirma antes del POST (el backend hace el cierre automático).
    if (this.hayVigenteSinCese() &&
        !confirm('Esto cerrará el contrato anterior vigente del empleado. ¿Continuar?')) {
      this.saving.set(false);
      return;
    }
    this.planillaApi.guardar(body).subscribe({
      next: () => this.onSaved('Planilla registrada. El contrato anterior vigente fue cerrado.'),
      error: (err: HttpErrorResponse) => this.onSaveErr(err),
    });
  }

  private onSaved(msg: string): void {
    this.saving.set(false);
    this.notif.exito(msg);
    this.viewState.set('list');
    this.loadList();
    this.cargarTiempoServicio(); // F2 — refrescar antigüedad tras registrar/editar un contrato
  }

  private onSaveErr(err: HttpErrorResponse): void {
    this.saving.set(false);
    this.onHttpSnack(err);
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
