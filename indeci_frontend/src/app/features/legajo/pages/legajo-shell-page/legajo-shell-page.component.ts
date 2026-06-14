import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-legajo-shell-page',
  standalone: true,
  imports: [RouterLink, RouterOutlet, MatButtonModule, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legajo-shell-page.component.html',
  styleUrl: './legajo-shell-page.component.css',
})
export class LegajoShellPageComponent {}
