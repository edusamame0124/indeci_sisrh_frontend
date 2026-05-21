import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

@Component({
  selector: 'app-sede-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sede-catalog-page.component.html',
  styleUrl: './sede-catalog-page.component.css',
})
export class SedeCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Sede',
    subtitulo: 'Ubicaciones físicas de la institución',
    fetchFn: () => this.api.listarSedes(),
    columnas: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'activo', label: 'Activo', formatter: (v) => (v === 1 ? 'Sí' : 'No') },
    ],
    searchKeys: ['nombre', 'direccion'],
  };
}
