import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';

import { MatChipsModule } from '@angular/material/chips';

import { MatDividerModule } from '@angular/material/divider';

import { MatIconModule } from '@angular/material/icon';

import type { SubsidioCasoResponse } from '../../../models/subsidio.models';

import {

  formatFechaSubsidio,

  formatPeriodoPlanillaLabel,

  iconoTipoCaso,

  labelEstadoCaso,

  labelTipoCaso,

} from '../../../utils/subsidio-calculo-display.utils';

import { periodoPlanillaDesdeCaso } from '../../../utils/subsidio-flujo.utils';



@Component({

  selector: 'app-subsidio-tab-resumen',

  standalone: true,

  imports: [CommonModule, MatCardModule, MatChipsModule, MatDividerModule, MatIconModule],

  changeDetection: ChangeDetectionStrategy.OnPush,

  templateUrl: './tab-resumen.component.html',

  styleUrl: './tab-resumen.component.css',

})

export class TabResumenComponent {

  readonly caso = input.required<SubsidioCasoResponse>();

  readonly modo = input<'operativo' | 'completo'>('operativo');

  readonly mostrarPeriodo = input(true);



  readonly labelTipo = labelTipoCaso;

  readonly labelEstado = labelEstadoCaso;

  readonly formatFecha = formatFechaSubsidio;

  readonly iconoTipo = iconoTipoCaso;



  readonly periodoRaw = computed(() => periodoPlanillaDesdeCaso(this.caso()));

  readonly periodoLabel = computed(() => formatPeriodoPlanillaLabel(this.periodoRaw()));

}


