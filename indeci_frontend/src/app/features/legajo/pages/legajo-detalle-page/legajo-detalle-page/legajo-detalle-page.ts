import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { LegajoStateService } from '../../../services/legajo-state';
import { LegajoApiService } from '../../../services/legajo-api';

@Component({
  selector: 'app-legajo-detalle-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './legajo-detalle-page.html',
  styleUrl: './legajo-detalle-page.scss',
})
export class LegajoDetallePage implements OnInit {
  readonly legajoState = inject(LegajoStateService);

  readonly exportandoPdf = signal(false);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly legajoApiService = inject(LegajoApiService);
  readonly reemplazandoSustento = signal(false);
  private readonly legajoDocumentoService = inject(LegajoApiService);
  ngOnInit(): void {
    const personaIdParam = this.route.snapshot.paramMap.get('personaId');
    const personaId = Number(personaIdParam);

    if (!personaId || Number.isNaN(personaId)) {
      this.legajoState.error.set('No se encontró un personaId válido.');
      return;
    }

    this.legajoState.cargarPorPersonaId(personaId);
  }

  volver(): void {
    this.router.navigate(['/legajo']);
  }

  subirFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.legajoState.subirFoto(file);
  }

  exportarPdf(): void {
    const personaId = this.legajoState.personaId();

    if (!personaId) {
      this.legajoState.error.set('No se encontró el personaId para exportar el legajo.');
      return;
    }

    this.exportandoPdf.set(true);

    this.legajoApiService.exportarLegajoPdf(personaId).subscribe({
      next: (blob) => {
        const file = new Blob([blob], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(file);

        window.open(url, '_blank');

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);

        this.exportandoPdf.set(false);
      },
      error: (error) => {
        console.error('Error exportando legajo PDF:', error);
        this.legajoState.error.set('No se pudo exportar el legajo en PDF.');
        this.exportandoPdf.set(false);
      },
    });
  }

  agregarFormacion(item?: any): void {
    const empleadoId = this.legajoState.empleadoId();

    if (!empleadoId) {
      this.legajoState.error.set('No se encontró el empleadoId.');
      return;
    }

    import('../../../dialogs/formacion-academica-dialog/formacion-academica-dialog').then(({ FormacionAcademicaDialog }) => {
      const ref = this.dialog.open(FormacionAcademicaDialog, {
        width: '760px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        disableClose: true,
        data: {
          empleadoId,
          modo: item ? 'EDITAR' : 'CREAR',
          item: item ?? null,
        },
      });

      ref.afterClosed().subscribe((guardado) => {
        if (guardado) {
          this.legajoState.recargar();
        }
      });
    });
  }

  agregarCapacitacion(item?: any): void {
    const empleadoId = this.legajoState.empleadoId();

    if (!empleadoId) {
      this.legajoState.error.set('No se encontró el empleadoId.');
      return;
    }

    import('../../../dialogs/capacitacion-dialog/capacitacion-dialog').then(
      ({ CapacitacionDialog }) => {
        const ref = this.dialog.open(CapacitacionDialog, {
          width: '760px',
          maxWidth: '95vw',
          maxHeight: '92vh',
          disableClose: true,
          data: {
            empleadoId,
            modo: item ? 'EDITAR' : 'CREAR',
            item: item ?? null,
          },
        });

        ref.afterClosed().subscribe((guardado) => {
          if (guardado) {
            this.legajoState.recargar();
          }
        });
      },
    );
  }

  agregarIdioma(item?: any): void {
    const empleadoId = this.legajoState.empleadoId();

    if (!empleadoId) {
      this.legajoState.error.set('No se encontró el empleadoId.');
      return;
    }

    import('../../../dialogs/idioma-dialog/idioma-dialog').then(({ IdiomaDialog }) => {
      const ref = this.dialog.open(IdiomaDialog, {
        width: '700px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        disableClose: true,
        data: {
          empleadoId,
          modo: item ? 'EDITAR' : 'CREAR',
          item: item ?? null,
        },
      });

      ref.afterClosed().subscribe((guardado) => {
        if (guardado) {
          this.legajoState.recargar();
        }
      });
    });
  }

  agregarConocimiento(item?: any): void {
  const empleadoId = this.legajoState.empleadoId();

  if (!empleadoId) {
    this.legajoState.error.set('No se encontró el empleadoId.');
    return;
  }

  import('../../../dialogs/conocimiento-informatico-dialog/conocimiento-informatico-dialog').then(
    ({ ConocimientoInformaticoDialog }) => {
      const ref = this.dialog.open(ConocimientoInformaticoDialog, {
        width: '700px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        disableClose: true,
        data: {
          empleadoId,
          modo: item ? 'EDITAR' : 'CREAR',
          item: item ?? null,
        },
      });

      ref.afterClosed().subscribe((guardado) => {
        if (guardado) {
          this.legajoState.recargar();
        }
      });
    },
  );
}

  agregarFamiliar(item?: any): void {
  const empleadoId = this.legajoState.empleadoId();

  if (!empleadoId) {
    this.legajoState.error.set('No se encontró el empleadoId.');
    return;
  }

  import('../../../dialogs/familiar-dialog/familiar-dialog').then(
    ({ FamiliarDialog }) => {
      const ref = this.dialog.open(FamiliarDialog, {
        width: '760px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        disableClose: true,
        data: {
          empleadoId,
          modo: item ? 'EDITAR' : 'CREAR',
          item: item ?? null,
        },
      });

      ref.afterClosed().subscribe((guardado) => {
        if (guardado) {
          this.legajoState.recargar();
        }
      });
    },
  );
}

 agregarExperiencia(item?: any): void {
  const empleadoId = this.legajoState.empleadoId();

  if (!empleadoId) {
    this.legajoState.error.set('No se encontró el empleadoId.');
    return;
  }

  import('../../../dialogs/experiencia-laboral-dialog/experiencia-laboral-dialog').then(
    ({ ExperienciaLaboralDialog }) => {
      const ref = this.dialog.open(ExperienciaLaboralDialog, {
        width: '820px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        disableClose: true,
        data: {
          empleadoId,
          modo: item ? 'EDITAR' : 'CREAR',
          item: item ?? null,
        },
      });

      ref.afterClosed().subscribe((guardado) => {
        if (guardado) {
          this.legajoState.recargar();
        }
      });
    },
  );
}

  agregarReconocimiento(item?: any): void {
  const empleadoId = this.legajoState.empleadoId();

  if (!empleadoId) {
    this.legajoState.error.set('No se encontró el empleadoId.');
    return;
  }

  import('../../../dialogs/reconocimiento-dialog/reconocimiento-dialog').then(
    ({ ReconocimientoDialog }) => {
      const ref = this.dialog.open(ReconocimientoDialog, {
        width: '720px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        disableClose: true,
        data: {
          empleadoId,
          modo: item ? 'EDITAR' : 'CREAR',
          item: item ?? null,
        },
      });

      ref.afterClosed().subscribe((guardado) => {
        if (guardado) {
          this.legajoState.recargar();
        }
      });
    },
  );
}

  agregarMedidaDisciplinaria(item?: any): void {
  const empleadoId = this.legajoState.empleadoId();

  if (!empleadoId) {
    this.legajoState.error.set('No se encontró el empleadoId.');
    return;
  }

  import('../../../dialogs/medida-disciplinaria-dialog/medida-disciplinaria-dialog').then(
    ({ MedidaDisciplinariaDialog }) => {
      const ref = this.dialog.open(MedidaDisciplinariaDialog, {
        width: '760px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        disableClose: true,
        data: {
          empleadoId,
          modo: item ? 'EDITAR' : 'CREAR',
          item: item ?? null,
        },
      });

      ref.afterClosed().subscribe((guardado) => {
        if (guardado) {
          this.legajoState.recargar();
        }
      });
    },
  );
}

  subirDocumento(): void {
    console.log('Pendiente modal de documento');
  }

  editarRegistro(tipo: string, item: any): void {
    if (!item?.id) {
      this.legajoState.error.set('No se encontró el ID del registro.');
      return;
    }

    switch (tipo) {
      case 'FORMACION':
        this.agregarFormacion(item);
        break;

      case 'CAPACITACION':
        this.agregarCapacitacion(item);
        break;

      case 'IDIOMA':
        this.agregarIdioma(item);
        break;

      case 'CONOCIMIENTO':
        this.agregarConocimiento(item);
        break;

      case 'FAMILIAR':
        this.agregarFamiliar(item);
        break;

      case 'EXPERIENCIA':
        this.agregarExperiencia(item);
        break;

      case 'RECONOCIMIENTO':
        this.agregarReconocimiento(item);
        break;

      case 'MEDIDA':
        this.agregarMedidaDisciplinaria(item);
        break;

      default:
        this.legajoState.error.set('Tipo de registro no soportado para edición.');
        break;
    }
  }

  eliminarRegistro(tipo: string, id?: number): void {
    if (!id) {
      return;
    }

    const confirmado = window.confirm('¿Está seguro de eliminar este registro?');

    if (!confirmado) {
      return;
    }

    let request;

    switch (tipo) {
      case 'FORMACION':
        request = this.legajoDocumentoService.eliminarFormacion(id);
        break;

      case 'CAPACITACION':
        request = this.legajoDocumentoService.eliminarCapacitacion(id);
        break;

      case 'IDIOMA':
        request = this.legajoDocumentoService.eliminarIdioma(id);
        break;

      case 'CONOCIMIENTO':
        request = this.legajoDocumentoService.eliminarConocimiento(id);
        break;

      case 'FAMILIAR':
        request = this.legajoDocumentoService.eliminarFamiliar(id);
        break;

      case 'EXPERIENCIA':
        request = this.legajoDocumentoService.eliminarExperienciaLaboral(id);
        break;

      case 'RECONOCIMIENTO':
        request = this.legajoDocumentoService.eliminarReconocimiento(id);
        break;

      case 'MEDIDA':
        request = this.legajoDocumentoService.eliminarMedidaDisciplinaria(id);
        break;

      case 'DOCUMENTO':
        request = this.legajoDocumentoService.eliminarDocumento(id);
        break;

      default:
        console.error('Tipo de registro no soportado:', tipo);
        this.legajoState.error.set('Tipo de registro no soportado.');
        return;
    }

    request.subscribe({
      next: () => {
        this.legajoState.recargar();
      },
      error: (error) => {
        console.error('Error eliminando registro:', error);
        this.legajoState.error.set('No se pudo eliminar el registro.');
      },
    });
  }

  verSustento(documentoId?: number | null): void {
    if (!documentoId) {
      this.legajoState.error.set('Este registro no tiene documento sustentatorio.');
      return;
    }

    this.legajoState.descargarDocumento(documentoId);
  }
  cambiarSustento(
    tipo: string,
    item: any,
    nombreDocumento?: string | null,
    fechaDocumento?: string | null,
  ): void {
    const empleadoId = this.legajoState.empleadoId();
    const registroId = item?.id;
    const documentoActualId = this.obtenerDocumentoActualId(item);

    if (!empleadoId) {
      this.legajoState.error.set('No se encontró el empleadoId.');
      return;
    }

    if (!registroId) {
      this.legajoState.error.set('No se encontró el ID del registro.');
      return;
    }

    if (!documentoActualId) {
      this.legajoState.error.set('Este registro no tiene documento vinculado para reemplazar.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/jpeg,image/png';

    input.onchange = () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      const confirmado = window.confirm(
        '¿Está seguro de reemplazar el sustento actual? El documento anterior quedará inactivo.',
      );

      if (!confirmado) {
        return;
      }

      this.reemplazandoSustento.set(true);
      this.legajoState.error.set(null);

      this.legajoDocumentoService
        .reemplazarSustentoUsandoDocumentoActual({
          tipo,
          registroId,
          empleadoId,
          documentoActualId,
          file,
          nombreDocumento,
          fechaDocumento,
          observacion: 'Reemplazo de sustento desde legajo',
        })
        .subscribe({
          next: () => {
            this.reemplazandoSustento.set(false);
            this.legajoState.recargar();
          },
          error: async (error) => {
            console.error('Error reemplazando sustento:', error);

            let mensaje = 'No se pudo reemplazar el sustento.';

            if (error.error instanceof Blob) {
              try {
                const text = await error.error.text();
                const json = JSON.parse(text);
                mensaje = json.mensaje || json.message || mensaje;
                console.error('Mensaje backend:', json);
              } catch {
                // queda mensaje genérico
              }
            }

            this.reemplazandoSustento.set(false);
            this.legajoState.error.set(mensaje);
          },
        });
    };

    input.click();
  }
  obtenerDocumentoActualId(item: any): number | null {
    return item?.legajoDocumentoId ?? item?.documentoId ?? item?.legajoDocumento?.id ?? null;
  }
}
