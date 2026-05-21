import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

/**
 * Estados compartidos de listados: carga, error, vacío y sin coincidencias (Fase 5).
 * Proyecta la tabla + paginador en el slot por defecto cuando hay datos visibles.
 */
@Component({
  selector: 'app-list-data-shell',
  standalone: true,
  imports: [MatProgressSpinnerModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="page-loading" aria-busy="true">
        <mat-progress-spinner
          mode="indeterminate"
          diameter="48"
          [attr.aria-label]="loadingLabel()"
        />
      </div>
    } @else if (errorMessage()) {
      <app-empty-state
        variant="error"
        icon="error_outline"
        title="No se pudo cargar la información"
        [description]="errorMessage()!"
      >
        <ng-content select="[retry]" />
      </app-empty-state>
    } @else if (totalCount() === 0) {
      <app-empty-state
        [icon]="emptyIcon()"
        [title]="emptyTitle()"
        [description]="emptyDescription()"
      >
        <ng-content select="[emptyAction]" />
      </app-empty-state>
    } @else if (filteredCount() === 0) {
      <app-empty-state
        icon="search_off"
        title="Sin coincidencias"
        [description]="noMatchDescription()"
      />
    } @else {
      <ng-content />
    }
  `,
})
export class ListDataShellComponent {
  readonly loading = input(false);
  readonly loadingLabel = input('Cargando');
  readonly errorMessage = input<string | null>(null);
  readonly totalCount = input(0);
  readonly filteredCount = input(0);
  readonly emptyIcon = input('inbox');
  readonly emptyTitle = input('Sin registros');
  readonly emptyDescription = input('No hay registros disponibles.');
  readonly noMatchDescription = input('No se encontraron coincidencias. Revise el texto e intente de nuevo.');
}
