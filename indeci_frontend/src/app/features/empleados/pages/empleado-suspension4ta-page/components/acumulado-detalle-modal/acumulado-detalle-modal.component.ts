import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { Ir4taAcumuladoDetalle } from '../../../../models/ir4ta-control-anual.model';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-acumulado-detalle-modal',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatTableModule, CurrencyPipe],
  template: `
    <h2 mat-dialog-title>Detalle del Acumulado Conocido por INDECI</h2>
    <mat-dialog-content>
      <p class="mat-body-1">
        Este es el desglose mensual de las bases imponibles y descuentos que conforman el acumulado para la retención de 4ta categoría.
      </p>
      
      <table mat-table [dataSource]="data" class="mat-elevation-z1" style="width: 100%; margin-top: 16px;">
        <!-- Periodo Column -->
        <ng-container matColumnDef="periodo">
          <th mat-header-cell *matHeaderCellDef> Período </th>
          <td mat-cell *matCellDef="let element"> {{element.periodo}} </td>
          <td mat-footer-cell *matFooterCellDef> <strong>Total</strong> </td>
        </ng-container>

        <!-- Ingresos Column -->
        <ng-container matColumnDef="ingresosBrutos">
          <th mat-header-cell *matHeaderCellDef class="text-right"> Remuneración Total (Ingresos) </th>
          <td mat-cell *matCellDef="let element" class="text-right sisrh-tabular"> {{element.ingresosBrutos | currency:'PEN':'S/ '}} </td>
          <td mat-footer-cell *matFooterCellDef class="text-right sisrh-tabular"> <strong>{{getTotalIngresos() | currency:'PEN':'S/ '}}</strong> </td>
        </ng-container>

        <!-- Deducciones Column -->
        <ng-container matColumnDef="deducciones">
          <th mat-header-cell *matHeaderCellDef class="text-right"> Faltas / Tardanzas (Egresos) </th>
          <td mat-cell *matCellDef="let element" class="text-right sisrh-tabular" style="color: #d32f2f;"> -{{element.deducciones | currency:'PEN':'S/ '}} </td>
          <td mat-footer-cell *matFooterCellDef class="text-right sisrh-tabular" style="color: #d32f2f;"> <strong>-{{getTotalDeducciones() | currency:'PEN':'S/ '}}</strong> </td>
        </ng-container>

        <!-- Base Afecta Column -->
        <ng-container matColumnDef="baseAfecta">
          <th mat-header-cell *matHeaderCellDef class="text-right"> Base Imponible IR4ta </th>
          <td mat-cell *matCellDef="let element" class="text-right sisrh-tabular"> <strong>{{element.baseAfecta | currency:'PEN':'S/ '}}</strong> </td>
          <td mat-footer-cell *matFooterCellDef class="text-right sisrh-tabular"> <strong>{{getTotalBase() | currency:'PEN':'S/ '}}</strong> </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        <tr mat-footer-row *matFooterRowDef="displayedColumns"></tr>
      </table>
      
      @if (data.length === 0) {
        <div class="empty-state">
          No hay períodos registrados para este año fiscal.
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .text-right { text-align: right; }
    .sisrh-tabular { font-variant-numeric: tabular-nums; }
    .empty-state { text-align: center; padding: 32px; color: #666; font-style: italic; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcumuladoDetalleModalComponent {
  data: Ir4taAcumuladoDetalle[] = inject(MAT_DIALOG_DATA);
  displayedColumns: string[] = ['periodo', 'ingresosBrutos', 'deducciones', 'baseAfecta'];

  getTotalIngresos() {
    return this.data.reduce((acc, curr) => acc + curr.ingresosBrutos, 0);
  }

  getTotalDeducciones() {
    return this.data.reduce((acc, curr) => acc + curr.deducciones, 0);
  }

  getTotalBase() {
    return this.data.reduce((acc, curr) => acc + curr.baseAfecta, 0);
  }
}
