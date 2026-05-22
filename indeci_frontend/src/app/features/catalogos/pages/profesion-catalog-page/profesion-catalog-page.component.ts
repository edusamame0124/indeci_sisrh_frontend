import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

@Component({
  selector: 'app-profesion-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profesion-catalog-page.component.html',
  styleUrl: './profesion-catalog-page.component.css',
})
export class ProfesionCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Profesión',
    fetchFn: () => this.api.listarProfesiones(),
    columnas: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'activo', label: 'Activo', formatter: (v) => (v === 1 ? 'Sí' : 'No') },
    ],
    searchKeys: ['nombre'],
  };
}
