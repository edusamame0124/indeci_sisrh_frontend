import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { LEGAJO_SECTIONS } from '../../config/legajo-sections.config';

@Component({
  selector: 'app-legajo-shell-page',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legajo-shell-page.component.html',
  styleUrl: './legajo-shell-page.component.css',
})
export class LegajoShellPageComponent {
  readonly sections = LEGAJO_SECTIONS;
}
