import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

@Component({
  selector: 'app-regimen-pensionario-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './regimen-pensionario-catalog-page.component.html',
  styleUrl: './regimen-pensionario-catalog-page.component.css',
})
export class RegimenPensionarioCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Régimen pensionario',
    subtitulo: 'AFP / ONP — usado por el módulo Pensión',
    fetchFn: () => this.api.listarRegimenesPensionarios(),
    columnas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'activo', label: 'Activo', formatter: (v) => (v === 1 ? 'Sí' : 'No') },
    ],
    searchKeys: ['codigo', 'nombre', 'tipo'],
  };
}
