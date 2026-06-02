import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, forkJoin, of } from 'rxjs';
import { SuspensionApiService } from '../../services/suspension-api.service';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import type { PersonaEmpleado } from '../../../empleados/models/persona-empleado.model';
import type { CatSuspensionRow, SuspensionRow, SuspensionInput } from '../../models/suspension.model';
import { SuspensionFormDialogComponent } from './suspension-form-dialog.component';

@Component({
  selector: 'app-suspension-list-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './suspension-list-page.component.html',
  styleUrl: './suspension-list-page.component.css',
})
export class SuspensionListPageComponent {
  private readonly api      = inject(SuspensionApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly dialog   = inject(MatDialog);
  private readonly snack    = inject(MatSnackBar);

  readonly loading        = signal(true);
  readonly loadingRows    = signal(false);
  readonly saving         = signal(false);
  readonly personas       = signal<readonly PersonaEmpleado[]>([]);
  readonly catalogo       = signal<readonly CatSuspensionRow[]>([]);
  readonly rows           = signal<readonly SuspensionRow[]>([]);
  readonly selectedEmpId  = signal<number | null>(null);

  readonly columns = ['codSuspension', 'descripcion', 'fechaInicio', 'fechaFin', 'diasAfectos', 'estado', 'acciones'];

  constructor() {
    forkJoin({
      personas: this.personaApi.listar().pipe(catchError(() => of([] as readonly PersonaEmpleado[]))),
      catalogo: this.api.catalogo().pipe(catchError(() => of([] as readonly CatSuspensionRow[]))),
    }).subscribe(({ personas, catalogo }) => {
      this.personas.set(personas.filter(p => p.empleadoId != null));
      this.catalogo.set(catalogo);
      this.loading.set(false);
    });
  }

  seleccionarEmpleado(empleadoId: number): void {
    this.selectedEmpId.set(empleadoId);
    this.loadingRows.set(true);
    this.rows.set([]);
    this.api.listarPorEmpleado(empleadoId)
      .pipe(catchError(() => of([] as readonly SuspensionRow[])))
      .subscribe(rows => { this.rows.set(rows); this.loadingRows.set(false); });
  }

  abrir(row?: SuspensionRow): void {
    const empId = this.selectedEmpId();
    if (!empId) return;
    const ref = this.dialog.open(SuspensionFormDialogComponent, {
      width: '500px',
      data: { catalogo: this.catalogo(), empleadoId: empId, row },
    });
    ref.afterClosed().subscribe((input: SuspensionInput | undefined) => {
      if (!input) return;
      this.saving.set(true);
      const op = row
        ? this.api.editar(row.id, input)
        : this.api.crear(input);
      op.subscribe({
        next: () => {
          this.snack.open(row ? 'Suspensión actualizada.' : 'Suspensión registrada.', 'OK', { duration: 3000 });
          this.seleccionarEmpleado(empId);
          this.saving.set(false);
        },
        error: () => { this.snack.open('Error al guardar. Intenta nuevamente.', 'OK', { duration: 4000 }); this.saving.set(false); },
      });
    });
  }

  eliminar(row: SuspensionRow): void {
    if (!confirm(`¿Anular suspensión ${row.codSuspension} del ${row.fechaInicio}?`)) return;
    this.saving.set(true);
    this.api.eliminar(row.id).subscribe({
      next: () => {
        this.snack.open('Suspensión anulada.', 'OK', { duration: 3000 });
        this.seleccionarEmpleado(this.selectedEmpId()!);
        this.saving.set(false);
      },
      error: () => { this.snack.open('Error al anular.', 'OK', { duration: 4000 }); this.saving.set(false); },
    });
  }

  descCatalogo(cod: string): string {
    return this.catalogo().find(c => c.codSuspension === cod)?.descripcion ?? cod;
  }
}
