import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CatalogoMetaTabComponent } from './tabs/catalogo-meta-tab/catalogo-meta-tab.component';
import { AsignacionMetaTabComponent } from './tabs/asignacion-meta-tab/asignacion-meta-tab.component';
import { EquivalenciasMetaTabComponent } from './tabs/equivalencias-meta-tab/equivalencias-meta-tab.component';
import { WizardActualizacionComponent } from './tabs/wizard-actualizacion/wizard-actualizacion.component';
import { TrazabilidadTabComponent } from './tabs/trazabilidad-tab/trazabilidad-tab.component';
import { MetaPptoApiService } from '../../services/meta-ppto-api.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import type { MetaPptoResumen } from '../../models/meta-ppto.model';

const ANIO_ACTUAL = new Date().getFullYear();

@Component({
  selector: 'app-metas-presupuestales-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    TrazabilidadTabComponent,
    CatalogoMetaTabComponent,
    AsignacionMetaTabComponent,
    EquivalenciasMetaTabComponent,
    WizardActualizacionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './metas-presupuestales-page.component.html',
  styleUrl: './metas-presupuestales-page.component.css',
})
export class MetasPresupuestalesPageComponent implements OnInit {
  private readonly api = inject(MetaPptoApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  readonly aniosDisponibles = [ANIO_ACTUAL + 1, ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2];
  readonly anioSeleccionado = signal(ANIO_ACTUAL + 1);
  readonly resumen = signal<MetaPptoResumen | null>(null);
  readonly loadingResumen = signal(false);

  ngOnInit(): void {
    this.cargarResumen();
  }

  onAnioChange(anio: number): void {
    this.anioSeleccionado.set(anio);
    this.cargarResumen();
  }

  private cargarResumen(): void {
    this.loadingResumen.set(true);
    this.api.resumen(this.anioSeleccionado()).subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.loadingResumen.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingResumen.set(false);
        const body = err.error;
        const msg = isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
        this.snack.open(msg, 'Cerrar', { duration: 5000 });
      },
    });
  }
}
