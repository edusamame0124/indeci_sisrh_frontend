import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

@Component({
  selector: 'app-regimen-laboral-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './regimen-laboral-catalog-page.component.html',
  styleUrl: './regimen-laboral-catalog-page.component.css',
})
export class RegimenLaboralCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Régimen laboral',
    fetchFn: () => this.api.listarRegimenesLaborales(),
    columnas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'activo', label: 'Activo', formatter: (v) => (v === 1 ? 'Sí' : 'No') },
    ],
    searchKeys: ['codigo', 'nombre'],
  };
}
