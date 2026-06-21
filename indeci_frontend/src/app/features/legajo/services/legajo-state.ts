import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { LegajoApiService } from './legajo-api';
import { LegajoResumen } from '../models/legajo.model';

@Injectable({
  providedIn: 'root',
})
export class LegajoStateService {
  private readonly api = inject(LegajoApiService);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<LegajoResumen | null>(null);
  readonly personaIdActual = signal<number | null>(null);

  readonly persona = computed(() => this.resumen()?.persona ?? null);
  readonly empleado = computed(() => this.resumen()?.empleado ?? null);
  private readonly legajoApi = inject(LegajoApiService);
  readonly personaId = computed(() => {
    const r = this.resumen();

    return (
      r?.personaId ??
      r?.persona?.id ??
      r?.persona?.personaId ??
      r?.empleado?.personaId ??
      this.personaIdActual() ??
      null
    );
  });

  readonly empleadoId = computed(() => {
    const r = this.resumen();

    return (
      r?.empleadoId ?? r?.empleado?.id ?? r?.empleado?.empleadoId ?? r?.persona?.empleadoId ?? null
    );
  });

  readonly fotoPerfil = computed(() => {
    const r = this.resumen();

    const foto = r?.fotoPerfil ?? r?.persona?.fotoPerfil ?? r?.persona?.foto ?? null;

    return this.normalizarFotoPerfil(foto);
  });
  private normalizarFotoPerfil(foto: string | null | undefined): string | null {
    if (!foto) {
      return null;
    }

    const value = foto.trim();

    if (!value) {
      return null;
    }

    // Ya viene lista para mostrar
    if (value.startsWith('data:image')) {
      return value;
    }

    // Ya viene como URL
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    // Base64 PNG
    if (value.startsWith('iVBOR')) {
      return `data:image/png;base64,${value}`;
    }

    // Base64 JPG/JPEG
    if (value.startsWith('/9j/')) {
      return `data:image/jpeg;base64,${value}`;
    }

    // Base64 WEBP
    if (value.startsWith('UklGR')) {
      return `data:image/webp;base64,${value}`;
    }

    // Fallback: asumimos imagen PNG si parece base64
    if (/^[A-Za-z0-9+/=]+$/.test(value) && value.length > 100) {
      return `data:image/png;base64,${value}`;
    }

    return value;
  }
  readonly nombreCompleto = computed(() => {
    const p = this.persona();

    if (!p) return '-';

    if (p.nombreCompleto) return p.nombreCompleto;

    return `${p.nombres ?? ''} ${p.apellidos ?? ''}`.trim() || '-';
  });

  cargarPorPersonaId(personaId: number): void {
    this.error.set(null);
    this.cargando.set(true);
    this.personaIdActual.set(personaId);

    this.api
      .obtenerResumen(personaId)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (data) => {
          this.resumen.set(this.normalizar(data));
        },
        error: (err) => {
          console.error('Error cargando legajo:', err);
          this.error.set('No se pudo cargar el legajo del trabajador.');
          this.resumen.set(null);
        },
      });
  }

  recargar(): void {
    const personaId = this.personaId();

    if (!personaId) return;

    this.cargarPorPersonaId(personaId);
  }

  subirFoto(file: File): void {
    const personaId = this.personaId();

    if (!personaId) {
      this.error.set('No se encontró el personaId para subir la foto.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.legajoApi.subirFotoPersona(personaId, file).subscribe({
      next: () => {
        this.cargando.set(false);
        this.recargar();
      },
      error: (error) => {
        console.error('Error subiendo foto:', error);
        this.error.set('No se pudo actualizar la foto de perfil.');
        this.cargando.set(false);
      },
    });
  };

  descargarDocumento(documentoId?: number | null): void {
    if (!documentoId) return;

    this.api.descargarDocumento(documentoId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (err) => {
        console.error('Error descargando documento:', err);
        this.error.set('No se pudo descargar el documento.');
      },
    });
  }

  private normalizar(data: LegajoResumen): LegajoResumen {
    return {
      ...data,
      formacionAcademica: data.formacionAcademica ?? [],
      capacitaciones: data.capacitaciones ?? [],
      idiomas: data.idiomas ?? [],
      conocimientosInformaticos: data.conocimientosInformaticos ?? [],
      familiares: data.familiares ?? [],
      experienciaLaboralExterna: data.experienciaLaboralExterna ?? [],
      reconocimientos: data.reconocimientos ?? [],
      medidasDisciplinarias: data.medidasDisciplinarias ?? [],
      documentos: data.documentos ?? [],
    };
  }
}
