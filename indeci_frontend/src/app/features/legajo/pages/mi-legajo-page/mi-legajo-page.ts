import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LegajoApiService } from '../../services/legajo-api';
import type { LegajoResumen } from '../../models/legajo.model';

@Component({
  selector: 'app-mi-legajo-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './mi-legajo-page.html',
  styleUrl: './mi-legajo-page.scss',
})
export class MiLegajoPage implements OnInit {
  private readonly router = inject(Router);
  private readonly legajoApi = inject(LegajoApiService);

  readonly legajo = signal<LegajoResumen | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarMiLegajo();
  }

  cargarMiLegajo(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.legajoApi.obtenerMiLegajo().subscribe({
      next: (legajo) => {
        this.legajo.set(legajo);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        console.error('Error cargando mi legajo:', error);

        this.error.set(
          'No se pudo obtener la información de su legajo.',
        );

        this.cargando.set(false);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/']);
  }

  descargarDocumento(documentoId?: number | null): void {
    if (!documentoId) {
      return;
    }

    this.legajoApi.descargarDocumento(documentoId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      },
      error: (error: unknown) => {
        console.error('Error descargando documento:', error);

        this.error.set(
          'No se pudo descargar el documento seleccionado.',
        );
      },
    });
  }

  obtenerDocumentoId(item: any): number | null {
    return (
      item?.legajoDocumentoId ??
      item?.documentoId ??
      item?.legajoDocumento?.id ??
      null
    );
  }
}