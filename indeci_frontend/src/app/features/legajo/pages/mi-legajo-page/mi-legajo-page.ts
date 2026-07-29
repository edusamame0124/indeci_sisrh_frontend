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
import { PersonaApiService } from '../../../empleados/services/persona-api.service';

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
  private readonly personaApi = inject(PersonaApiService);

  readonly legajo = signal<LegajoResumen | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Misma foto que "Mi perfil" — se sube/cambia solo desde allí, acá es de solo lectura.
   * Se pide por separado (mismo endpoint /persona/me/foto) en vez de venir embebida en
   * el legajo: esa descarga pasa por FTP y no debe bloquear el resto de la pantalla.
   */
  readonly fotoUrl = signal<string | null>(null);
  readonly cargandoFoto = signal(false);

  ngOnInit(): void {
    this.cargarMiLegajo();
    this.cargarFoto();
  }

  private cargarFoto(): void {
    this.cargandoFoto.set(true);

    this.personaApi.obtenerFotoMiPerfil().subscribe({
      next: (blob) => {
        this.cargandoFoto.set(false);

        // Backend responde 204 (blob vacío) cuando aún no se subió una foto.
        if (blob.size === 0) {
          this.fotoUrl.set(null);
          return;
        }

        this.fotoUrl.set(URL.createObjectURL(blob));
      },
      error: (error: unknown) => {
        console.error('Error al cargar la foto', error);
        this.cargandoFoto.set(false);
        this.fotoUrl.set(null);
      },
    });
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