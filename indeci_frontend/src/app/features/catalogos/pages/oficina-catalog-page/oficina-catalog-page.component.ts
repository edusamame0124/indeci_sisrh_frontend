import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogoApiService } from '../../../empleados/services/catalogo-api.service';
import {
  CatalogoReadonlyPageComponent,
  type CatalogoReadonlyConfig,
} from '../../components/catalogo-readonly-page/catalogo-readonly-page.component';

/**
 * Catálogo Oficina (Spec 009 — Módulo 1).
 *
 * NOTA: el brief original pedía filtro por Sede sobre la lista. El backend
 * provee `/api/catalogos/oficinas/sede/{id}` pero el componente base actual
 * solo soporta filtro de texto. En MVP la búsqueda permite filtrar por
 * `sedeId` numérico o por nombre/sigla. El selector dedicado de Sede se
 * difiere a Spec 010 (mejora UX no bloqueante).
 */
@Component({
  selector: 'app-oficina-catalog-page',
  standalone: true,
  imports: [CatalogoReadonlyPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './oficina-catalog-page.component.html',
  styleUrl: './oficina-catalog-page.component.css',
})
export class OficinaCatalogPageComponent {
  private readonly api = inject(CatalogoApiService);

  readonly config: CatalogoReadonlyConfig = {
    titulo: 'Oficina',
    subtitulo: 'Oficinas asociadas a sedes',
    fetchFn: () => this.api.listarOficinas(),
    columnas: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'sigla', label: 'Sigla' },
      { key: 'sedeId', label: 'Sede ID' },
      { key: 'activo', label: 'Activo', formatter: (v) => (v === 1 ? 'Sí' : 'No') },
    ],
    searchKeys: ['nombre', 'sigla', 'sedeId'],
  };
}
