import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface EstructuraProgramaticaItem {
  id: number;
  codigo: string;
  categoria: string;
  funcion: string;
  programa: string;
  subPrograma: string;
  actividad: string;
  activo: boolean;
}

/**
 * Tab Estructura Programática — metas presupuestales y cadenas
 * programáticas vinculadas al régimen CAS del ejercicio anual.
 * Base normativa: Ley 28411 Ley SGNP · Clasificadores DNPP.
 */
@Component({
  selector: 'app-estructura-programatica-tab',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estructura-programatica-tab.component.html',
  styleUrl: './estructura-programatica-tab.component.css',
})
export class EstructuraProgramaticaTabComponent implements OnInit {
  readonly columns = [
    'codigo', 'categoria', 'funcion', 'programa', 'subPrograma', 'actividad', 'estado', 'acciones',
  ] as const;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');

  private readonly _rows = signal<readonly EstructuraProgramaticaItem[]>([]);

  readonly rows = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this._rows();
    return this._rows().filter(
      (r) =>
        r.codigo.toLowerCase().includes(q) ||
        r.actividad.toLowerCase().includes(q) ||
        r.programa.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  onBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  agregar(): void {
    // TODO: abrir dialog de nueva estructura programática
    console.log('agregar estructura');
  }

  editar(row: EstructuraProgramaticaItem): void {
    // TODO: abrir dialog de edición
    console.log('editar', row);
  }

  private cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    // TODO: reemplazar con MetaPresupuestalApiService
    setTimeout(() => {
      this._rows.set([
        {
          id: 1,
          codigo: '3.999999.0001',
          categoria: '5',
          funcion: '03',
          programa: '037',
          subPrograma: '0075',
          actividad: 'Gestión de Recursos Humanos',
          activo: true,
        },
        {
          id: 2,
          codigo: '3.999999.0002',
          categoria: '5',
          funcion: '03',
          programa: '037',
          subPrograma: '0075',
          actividad: 'Administración de Personal CAS',
          activo: true,
        },
      ]);
      this.loading.set(false);
    }, 350);
  }
}
