import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

@Component({
  selector: 'app-condicion-laboral-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './condicion-laboral-catalog-page.component.html',
  styleUrl: './condicion-laboral-catalog-page.component.css',
})
export class CondicionLaboralCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Condición laboral',
    fetchFn: () => this.api.listarCondicionesLaborales(),
    columnas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'activo', label: 'Activo', formatter: (v) => (v === 1 ? 'Sí' : 'No') },
    ],
    searchKeys: ['codigo', 'nombre'],
  };
}
