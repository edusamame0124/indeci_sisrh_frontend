import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

@Component({
  selector: 'app-sexo-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sexo-catalog-page.component.html',
  styleUrl: './sexo-catalog-page.component.css',
})
export class SexoCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Sexo',
    subtitulo: 'Catálogo institucional INEI',
    fetchFn: () => this.api.listarSexos(),
    columnas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
    ],
    searchKeys: ['codigo', 'nombre'],
  };
}
