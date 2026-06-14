import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ParametroPrevisionalApiService } from '../../../../../../services/parametro-previsional-api.service';
import type { ResolverParametroResult } from '../../../../../../models/parametro-previsional.model';

type TipoSistema = 'ONP' | 'AFP' | '';

/**
 * Resuelve el parámetro previsional vigente para un empleado y período dados.
 * Permite al usuario de RRHH auditar qué valores usará el motor de planilla.
 */
@Component({
  selector: 'app-resolver-parametro',
  standalone: true,
  imports: [
    DecimalPipe,
    CurrencyPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resolver-parametro.component.html',
  styleUrl: './resolver-parametro.component.css',
})
export class ResolverParametroComponent {
  private readonly api = inject(ParametroPrevisionalApiService);

  readonly empleadoId = signal('');
  readonly periodo    = signal('');
  readonly sistema    = signal<TipoSistema>('');

  readonly resolving = signal(false);
  readonly error     = signal<string | null>(null);
  readonly resultado = signal<ResolverParametroResult | null>(null);

  readonly sistemasOpciones: Array<{ valor: TipoSistema; etiqueta: string }> = [
    { valor: '',    etiqueta: 'Detectar automáticamente' },
    { valor: 'AFP', etiqueta: 'AFP (Sistema Privado)' },
    { valor: 'ONP', etiqueta: 'ONP (Sistema Nacional)' },
  ];

  private readonly PERIODO_RE = /^[0-9]{4}(0[1-9]|1[0-2])$/;

  get periodoInvalido(): boolean {
    const p = this.periodo().trim();
    return p.length > 0 && !this.PERIODO_RE.test(p);
  }

  canResolve(): boolean {
    return (
      !!this.empleadoId().trim() &&
      this.PERIODO_RE.test(this.periodo().trim()) &&
      !this.resolving()
    );
  }

  resolver(): void {
    if (!this.canResolve()) return;
    this.resolving.set(true);
    this.error.set(null);
    this.resultado.set(null);

    this.api.resolver(
      Number(this.empleadoId().trim()),
      this.periodo().trim(),
    ).subscribe({
      next: (r) => { this.resultado.set(r); this.resolving.set(false); },
      error: () => { this.error.set('No se pudo resolver el parámetro. Verifique el ID de empleado y el período.'); this.resolving.set(false); },
    });
  }

  limpiar(): void {
    this.empleadoId.set('');
    this.periodo.set('');
    this.sistema.set('');
    this.resultado.set(null);
    this.error.set(null);
  }

  formatPeriodo(periodo: string | null): string {
    if (!periodo || periodo.length !== 6) return periodo ?? '–';
    return `${periodo.slice(4, 6)}/${periodo.slice(0, 4)}`;
  }
}
