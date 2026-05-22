import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

@Component({
  selector: 'app-estado-civil-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estado-civil-catalog-page.component.html',
  styleUrl: './estado-civil-catalog-page.component.css',
})
export class EstadoCivilCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Estado civil',
    subtitulo: 'Catálogo institucional INEI',
    fetchFn: () => this.api.listarEstadosCiviles(),
    columnas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
    ],
    searchKeys: ['codigo', 'nombre'],
  };
}
