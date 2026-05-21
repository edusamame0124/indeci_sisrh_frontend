import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

@Component({
  selector: 'app-tipo-contrato-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tipo-contrato-catalog-page.component.html',
  styleUrl: './tipo-contrato-catalog-page.component.css',
})
export class TipoContratoCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Tipo de contrato',
    fetchFn: () => this.api.listarTiposContrato(),
    columnas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'activo', label: 'Activo', formatter: (v) => (v === 1 ? 'Sí' : 'No') },
    ],
    searchKeys: ['codigo', 'nombre'],
  };
}
