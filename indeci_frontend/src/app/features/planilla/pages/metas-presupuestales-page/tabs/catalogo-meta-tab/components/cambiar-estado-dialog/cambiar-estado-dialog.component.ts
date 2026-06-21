import { Component, Inject, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import type { MetaPptoCat, MetaCatEstado } from '../../../../../../models/meta-ppto.model';

export interface CambiarEstadoDialogData {
  nuevoEstado: MetaCatEstado;
  metas: MetaPptoCat[];
}

export interface CambiarEstadoDialogResult {
  confirmar: true;
  motivo?: string;
}

/** Estados origen válidos para cada transición */
const ESTADOS_ORIGEN: Record<MetaCatEstado, MetaCatEstado[]> = {
  BORRADOR:  [],
  VALIDADO:  ['BORRADOR'],
  PUBLICADO: ['BORRADOR', 'VALIDADO'],
  CERRADO:   ['PUBLICADO'],
  ANULADO:   ['BORRADOR', 'VALIDADO', 'PUBLICADO'],
};

const ETIQUETA: Record<MetaCatEstado, string> = {
  BORRADOR:  'Borrador',
  VALIDADO:  'Validar',
  PUBLICADO: 'Publicar',
  CERRADO:   'Cerrar',
  ANULADO:   'Anular',
};

const ICONO: Record<MetaCatEstado, string> = {
  BORRADOR:  'edit_note',
  VALIDADO:  'fact_check',
  PUBLICADO: 'publish',
  CERRADO:   'lock',
  ANULADO:   'block',
};

@Component({
  selector: 'app-cambiar-estado-dialog',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './cambiar-estado-dialog.component.html',
  styleUrl: './cambiar-estado-dialog.component.css',
})
export class CambiarEstadoDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly etiqueta: string;
  readonly icono: string;
  readonly metasAptas: MetaPptoCat[];
  readonly metasOmitidas: MetaPptoCat[];
  readonly requiereMotivo: boolean;

  readonly form = this.fb.nonNullable.group({ motivo: [''] });

  constructor(
    public readonly dialogRef: MatDialogRef<CambiarEstadoDialogComponent, CambiarEstadoDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CambiarEstadoDialogData,
  ) {
    const estadosPermitidos = ESTADOS_ORIGEN[data.nuevoEstado] ?? [];
    this.metasAptas    = data.metas.filter(m => estadosPermitidos.includes(m.estado));
    this.metasOmitidas = data.metas.filter(m => !estadosPermitidos.includes(m.estado));
    this.etiqueta      = ETIQUETA[data.nuevoEstado] ?? data.nuevoEstado;
    this.icono         = ICONO[data.nuevoEstado] ?? 'swap_horiz';
    this.requiereMotivo = data.nuevoEstado === 'ANULADO';

    if (this.requiereMotivo) {
      this.form.controls.motivo.setValidators([Validators.required, Validators.minLength(5)]);
      this.form.controls.motivo.updateValueAndValidity();
    }
  }

  get puedeConfirmar(): boolean {
    return this.metasAptas.length > 0 && this.form.valid;
  }

  confirmar(): void {
    if (!this.puedeConfirmar) return;
    const result: CambiarEstadoDialogResult = { confirmar: true };
    if (this.requiereMotivo) result.motivo = this.form.getRawValue().motivo.trim();
    this.dialogRef.close(result);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  estadoLabel(estado: string): string {
    return ETIQUETA[estado as MetaCatEstado] ?? estado;
  }

  estadoClass(estado: string): string {
    const mapa: Record<string, string> = {
      BORRADOR: 'badge-warn', VALIDADO: 'badge-info',
      PUBLICADO: 'badge-ok',  CERRADO: 'badge-gray', ANULADO: 'badge-err',
    };
    return mapa[estado] ?? 'badge-gray';
  }
}
