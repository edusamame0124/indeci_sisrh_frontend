import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { HttpErrorResponse } from '@angular/common/http';
import { MetaPptoApiService } from '../../../../../../services/meta-ppto-api.service';
import type { MetaPptoResumen, MetaPptoCat } from '../../../../../../models/meta-ppto.model';

@Component({
  selector: 'app-meta-dashboard-tab',
  standalone: true,
  imports: [NgClass, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meta-dashboard-tab.component.html',
  styleUrl: './meta-dashboard-tab.component.css',
})
export class MetaDashboardTabComponent implements OnChanges {
  @Input() anioFiscal = 0;
  @Output() readonly navegarA = new EventEmitter<number>();

  private readonly api = inject(MetaPptoApiService);

  readonly loadingResumen = signal(false);
  readonly resumen = signal<MetaPptoResumen | null>(null);
  readonly previewCatalogo = signal<MetaPptoCat[]>([]);
  readonly loadingPreview = signal(false);

  readonly columnasCat = ['metaCodigo', 'centroCosto', 'actividad', 'estado'] as const;

  ngOnChanges(): void {
    if (this.anioFiscal > 0) {
      this.cargarResumen();
      this.cargarPreview();
    }
  }

  cargarResumen(): void {
    this.loadingResumen.set(true);
    this.api.resumen(this.anioFiscal).subscribe({
      next: (r) => { this.resumen.set(r); this.loadingResumen.set(false); },
      error: (_: HttpErrorResponse) => this.loadingResumen.set(false),
    });
  }

  cargarPreview(): void {
    this.loadingPreview.set(true);
    this.api.listarCatalogo(this.anioFiscal).subscribe({
      next: (metas) => { this.previewCatalogo.set(metas.slice(0, 5)); this.loadingPreview.set(false); },
      error: (_: HttpErrorResponse) => this.loadingPreview.set(false),
    });
  }

  ir(tabIndex: number): void {
    this.navegarA.emit(tabIndex);
  }

  estadoClass(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'badge-warn', PUBLICADO: 'badge-ok',
      ANULADO: 'badge-err', CERRADO: 'badge-gray', VALIDADO: 'badge-info',
    };
    return mapa[estado] ?? 'badge-gray';
  }

  estadoLabel(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'Borrador', PUBLICADO: 'Publicado',
      ANULADO: 'Anulado', CERRADO: 'Cerrado', VALIDADO: 'Validado',
    };
    return mapa[estado] ?? estado;
  }
}
