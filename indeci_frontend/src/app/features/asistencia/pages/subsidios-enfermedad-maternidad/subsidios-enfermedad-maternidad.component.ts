import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BandejaCasosComponent } from './components/bandeja-casos/bandeja-casos.component';
import { DetalleCasoComponent } from './components/detalle-caso/detalle-caso.component';

type VistaSubsidios = 'bandeja' | 'detalle';

/**
 * Subsidios por Enfermedad e Incapacidad Temporal y Subsidios por Maternidad.
 * Shell orquestador P0-F3: bandeja de casos + detalle con pestañas.
 */
@Component({
  selector: 'app-subsidios-enfermedad-maternidad',
  standalone: true,
  imports: [BandejaCasosComponent, DetalleCasoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subsidios-enfermedad-maternidad.component.html',
  styleUrl: './subsidios-enfermedad-maternidad.component.css',
})
export class SubsidiosEnfermedadMaternidadComponent {
  readonly vista = signal<VistaSubsidios>('bandeja');
  readonly casoId = signal<number | null>(null);

  abrirDetalle(id: number): void {
    this.casoId.set(id);
    this.vista.set('detalle');
  }

  volverBandeja(): void {
    this.vista.set('bandeja');
  }
}
