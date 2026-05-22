import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

@Component({
  selector: 'app-dependencia-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dependencia-catalog-page.component.html',
  styleUrl: './dependencia-catalog-page.component.css',
})
export class DependenciaCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Dependencia',
    fetchFn: () => this.api.listarDependencias(),
    columnas: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'sigla', label: 'Sigla' },
    ],
    searchKeys: ['nombre', 'sigla'],
  };
}
