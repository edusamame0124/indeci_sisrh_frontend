import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

@Component({
  selector: 'app-tipo-personal-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tipo-personal-catalog-page.component.html',
  styleUrl: './tipo-personal-catalog-page.component.css',
})
export class TipoPersonalCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Tipo de personal',
    subtitulo: 'Catálogo institucional INDECI',
    fetchFn: () => this.api.listarTiposPersonal(),
    columnas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
    ],
    searchKeys: ['codigo', 'nombre'],
  };
}
