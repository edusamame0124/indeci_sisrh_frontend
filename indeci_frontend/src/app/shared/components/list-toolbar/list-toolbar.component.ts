import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/**
 * Barra de herramientas compartida para listados (Fase 5).
 * Búsqueda local + contador «N de M registros» + slot de acciones.
 */
@Component({
  selector: 'app-list-toolbar',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar sisrh-toolbar" role="search">
      @if (showSearch()) {
        <mat-form-field appearance="outline" class="toolbar__search">
          <mat-label>{{ searchLabel() }}</mat-label>
          <input
            matInput
            type="search"
            autocomplete="off"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            [attr.aria-label]="searchAriaLabel()"
          />
          <mat-icon matSuffix fontIcon="search" aria-hidden="true" />
        </mat-form-field>
      }
      <span class="toolbar__count" role="status" aria-live="polite">
        {{ filteredCount() }} de {{ totalCount() }} registros
      </span>
      <div class="toolbar__actions">
        <ng-content select="[toolbarActions]" />
      </div>
    </div>
  `,
})
export class ListToolbarComponent {
  readonly searchQuery = input('');
  readonly searchLabel = input('Buscar');
  readonly searchAriaLabel = input('Buscar en el listado');
  readonly filteredCount = input(0);
  readonly totalCount = input(0);
  readonly showSearch = input(true);

  readonly searchChange = output<string>();

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChange.emit(value);
  }
}
