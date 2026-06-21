import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { HttpErrorResponse } from '@angular/common/http';
import { AsistenciaApiService } from '../../../../services/asistencia-api.service';
import { ErrorMessageService } from '../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../core/models/error-response.model';
import type { AsistenciaDiariaRow, AsistenciaDiariaEditInput } from '../../../../models/asistencia-diaria.model';
import { TIPOS_DIA } from '../../../../models/asistencia.model';
import { CONDICION_LABELS } from '../../../../models/asistencia-diaria.model';

export interface AsistenciaDiariaEditDialogData {
  readonly row: AsistenciaDiariaRow;
}

type PapeletaDecision = 'AUTORIZAR' | 'NO_AUTORIZAR';

function inicialPapeletaDecision(row: AsistenciaDiariaRow): PapeletaDecision | null {
  if (row.papeletaAutorizada === 1) return 'AUTORIZAR';
  if (row.papeletaAutorizada === 0) return 'NO_AUTORIZAR';
  return null;
}

@Component({
  selector: 'app-asistencia-diaria-edit-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asistencia-diaria-edit-dialog.component.html',
  styleUrl: './asistencia-diaria-edit-dialog.component.css',
})
export class AsistenciaDiariaEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AsistenciaApiService);
  private readonly errors = inject(ErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<AsistenciaDiariaEditDialogComponent>);
  readonly data = inject<AsistenciaDiariaEditDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly tiposDia = TIPOS_DIA;
  readonly condicionLabels = CONDICION_LABELS;
  readonly tienePapeleta = this.data.row.tienePapeletaAprobada;

  readonly form = this.fb.group({
    tipoDia: [
      { value: this.data.row.tipoDia, disabled: this.data.row.tienePapeletaAprobada },
      [Validators.required],
    ],
    marcaEntrada: [this.data.row.marcaEntrada ?? ''],
    marcaSalida: [this.data.row.marcaSalida ?? ''],
    minutosTardanza: [this.data.row.minutosTardanza ?? 0, [Validators.min(0), Validators.max(480)]],
    observacion: [this.data.row.observacion ?? '', [Validators.maxLength(500)]],
    papeletaDecision: [
      inicialPapeletaDecision(this.data.row),
      this.data.row.tienePapeletaAprobada ? [Validators.required] : [],
    ],
    papeletaMotivoRechazo: [
      this.data.row.papeletaMotivoRechazo ?? '',
      [Validators.maxLength(500)],
    ],
  });

  constructor() {
    if (this.tienePapeleta) {
      this.actualizarValidadoresMotivoRechazo(this.form.controls.papeletaDecision.value);
      this.form.controls.papeletaDecision.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((valor) => this.actualizarValidadoresMotivoRechazo(valor));
    }
  }

  labelTipo(tipo: string): string {
    return CONDICION_LABELS[tipo] ?? tipo;
  }

  fmtHoras(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${value} h`;
  }

  guardar(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.errorMsg.set(null);
    const v = this.form.getRawValue();
    const base: AsistenciaDiariaEditInput = {
      marcaEntrada: v.marcaEntrada?.trim() || null,
      marcaSalida: v.marcaSalida?.trim() || null,
      minutosTardanza: v.minutosTardanza ?? 0,
      observacion: v.observacion?.trim() || null,
    };
    const body: AsistenciaDiariaEditInput = this.tienePapeleta
      ? {
          ...base,
          papeletaAutorizada: (v.papeletaDecision as PapeletaDecision) === 'AUTORIZAR',
          papeletaMotivoRechazo:
            (v.papeletaDecision as PapeletaDecision) === 'NO_AUTORIZAR'
              ? v.papeletaMotivoRechazo?.trim() || null
              : null,
        }
      : { ...base, tipoDia: v.tipoDia ?? undefined };
    this.api.editarDia(this.data.row.detalleId, body).subscribe({
      next: (row) => {
        this.saving.set(false);
        this.dialogRef.close(row);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const bodyErr = err instanceof HttpErrorResponse ? err.error : null;
        this.errorMsg.set(
          isErrorResponse(bodyErr)
            ? this.errors.translate(bodyErr.mensaje)
            : this.errors.translate(null),
        );
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  private actualizarValidadoresMotivoRechazo(valor: PapeletaDecision | null | undefined): void {
    const ctrl = this.form.controls.papeletaMotivoRechazo;
    if (valor === 'NO_AUTORIZAR') {
      ctrl.setValidators([Validators.required, Validators.maxLength(500)]);
    } else {
      ctrl.setValidators([Validators.maxLength(500)]);
      ctrl.setValue('');
    }
    ctrl.updateValueAndValidity();
  }
}
