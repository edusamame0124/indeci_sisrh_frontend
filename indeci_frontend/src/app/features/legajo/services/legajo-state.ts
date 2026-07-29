import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { LegajoApiService } from './legajo-api';
import { LegajoResumen } from '../models/legajo.model';
import { normalizarFotoPerfil } from '../utils/legajo-foto.util';

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

    return normalizarFotoPerfil(foto);
  });
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
  }
  obtenerDocumentoActualId(item: any): number | null {
    return item?.legajoDocumentoId ?? item?.documentoId ?? item?.legajoDocumento?.id ?? null;
  }

  descargarDocumento(documentoId?: number | null): void {
    if (!documentoId) {
      this.error.set('Este registro no tiene documento sustentatorio vinculado.');
      return;
    }

    this.api.descargarDocumento(documentoId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
      },
      error: async (err) => {
        console.error('Error descargando documento:', err);

        let mensaje = 'No se pudo descargar el documento.';

        if (err.error instanceof Blob) {
          try {
            const text = await err.error.text();
            const json = JSON.parse(text);
            mensaje = json.mensaje || json.message || mensaje;
            console.error('Mensaje backend:', json);
          } catch {
            // dejamos el mensaje genérico
          }
        }

        this.error.set(mensaje);
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
