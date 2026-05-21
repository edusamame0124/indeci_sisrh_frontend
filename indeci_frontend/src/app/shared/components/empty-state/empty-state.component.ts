import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type EmptyStateVariant = 'default' | 'error';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="sisrh-empty-state"
      [class.sisrh-empty-state--error]="variant() === 'error'"
      [attr.role]="variant() === 'error' ? 'alert' : 'status'"
    >
      <div class="sisrh-empty-state__icon-wrap" aria-hidden="true">
        <mat-icon class="sisrh-empty-state__icon" [fontIcon]="icon()" />
      </div>
      <p class="sisrh-empty-state__title">{{ title() }}</p>
      @if (description()) {
        <p class="sisrh-empty-state__desc">{{ description() }}</p>
      }
      <div class="sisrh-empty-state__actions">
        <ng-content />
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly variant = input<EmptyStateVariant>('default');
}
