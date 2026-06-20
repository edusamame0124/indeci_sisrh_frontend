import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import type { SubsidioCasoResponse } from '../../../models/subsidio.models';
import { labelEstadoCaso } from '../../../utils/subsidio-calculo-display.utils';
import { TabBaseHistoricaComponent } from '../tab-base-historica/tab-base-historica.component';
import { TabCittDocumentosComponent } from '../tab-citt-documentos/tab-citt-documentos.component';
import { TabHistorialComponent } from '../tab-historial/tab-historial.component';
import { TabLineaTiempoComponent } from '../tab-linea-tiempo/tab-linea-tiempo.component';

@Component({
  selector: 'app-subsidio-paso-informacion-complementaria',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    TabBaseHistoricaComponent,
    TabCittDocumentosComponent,
    TabHistorialComponent,
    TabLineaTiempoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tab-panel paso-comp">
      <p class="paso-comp__intro">
        Información de consulta, auditoría y soporte normativo. No es necesaria para el flujo operativo diario.
      </p>

      <mat-accordion multi class="paso-comp__accordion">
        <mat-expansion-panel (opened)="panelBase.set(true)">
          <mat-expansion-panel-header>
            <mat-panel-title>Base histórica detallada</mat-panel-title>
            <mat-panel-description>Remuneraciones por período</mat-panel-description>
          </mat-expansion-panel-header>
          @if (panelBase()) {
            <app-subsidio-tab-base
              [casoId]="casoId()"
              modo="detalle"
              (casoActualizado)="casoActualizado.emit($event)"
            />
          }
        </mat-expansion-panel>

        <mat-expansion-panel (opened)="panelCitt.set(true)">
          <mat-expansion-panel-header>
            <mat-panel-title>Documentos y CITT</mat-panel-title>
            <mat-panel-description>Certificados y sustentos</mat-panel-description>
          </mat-expansion-panel-header>
          @if (panelCitt()) {
            <app-subsidio-tab-citt
              [casoId]="casoId()"
              [caso]="caso()"
              modo="completo"
              (casoActualizado)="casoActualizado.emit($event)"
            />
          }
        </mat-expansion-panel>

        <mat-expansion-panel (opened)="panelHistorial.set(true)">
          <mat-expansion-panel-header>
            <mat-panel-title>Historial y validaciones</mat-panel-title>
            <mat-panel-description>Reglas aplicadas al caso</mat-panel-description>
          </mat-expansion-panel-header>
          @if (panelHistorial()) {
            <app-subsidio-tab-historial [casoId]="casoId()" modo="completo" />
          }
        </mat-expansion-panel>

        <mat-expansion-panel (opened)="panelActividad.set(true)">
          <mat-expansion-panel-header>
            <mat-panel-title>Actividad del caso</mat-panel-title>
            <mat-panel-description>Eventos registrados</mat-panel-description>
          </mat-expansion-panel-header>
          @if (panelActividad()) {
            <app-subsidio-tab-timeline [casoId]="casoId()" titulo="Actividad del caso" />
          }
        </mat-expansion-panel>

        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>PLAME</mat-panel-title>
            <mat-panel-description>Cuando corresponda</mat-panel-description>
          </mat-expansion-panel-header>
          <p class="paso-comp__placeholder" role="status">
            La información PLAME estará disponible cuando el subsidio haya sido aplicado a planilla y el período
            correspondiente esté habilitado para exportación.
          </p>
        </mat-expansion-panel>

        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Parámetros y reglas aplicadas</mat-panel-title>
          </mat-expansion-panel-header>
          @if (caso(); as c) {
            <dl class="tab-panel__dl">
              <div>
                <dt>Modo de cálculo</dt>
                <dd>{{ c.modoCalculo === 'SIMULACION' ? 'Simulación' : 'Cálculo oficial' }}</dd>
              </div>
              <div>
                <dt>Regla vigente</dt>
                <dd>{{ reglaLabel() }}</dd>
              </div>
              <div>
                <dt>Estado del caso</dt>
                <dd>{{ labelEstado(c.estado) }}</dd>
              </div>
            </dl>
          }
        </mat-expansion-panel>

        @if (caso().observacion) {
          <mat-expansion-panel expanded="false">
            <mat-expansion-panel-header>
              <mat-panel-title>Observaciones</mat-panel-title>
            </mat-expansion-panel-header>
            <p class="paso-comp__obs">{{ caso().observacion }}</p>
          </mat-expansion-panel>
        }
      </mat-accordion>
    </div>
  `,
  styles: `
    .paso-comp__intro {
      margin: 0 0 16px;
      font-size: 13px;
      color: #64748b;
    }

    .paso-comp__accordion {
      display: block;
    }

    .paso-comp__placeholder,
    .paso-comp__obs {
      margin: 0;
      font-size: 13px;
      color: #475569;
    }
  `,
})
export class PasoInformacionComplementariaComponent {
  readonly casoId = input.required<number>();
  readonly caso = input.required<SubsidioCasoResponse>();
  readonly reglaLabel = input('Regla pendiente');
  readonly casoActualizado = output<SubsidioCasoResponse>();

  readonly labelEstado = labelEstadoCaso;

  readonly panelBase = signal(false);
  readonly panelCitt = signal(false);
  readonly panelHistorial = signal(false);
  readonly panelActividad = signal(false);
}
