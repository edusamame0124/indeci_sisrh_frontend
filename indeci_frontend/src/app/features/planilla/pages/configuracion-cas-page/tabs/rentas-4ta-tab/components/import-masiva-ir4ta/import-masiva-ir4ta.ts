import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ErrorMessageService } from '../../../../../../../../core/services/error-message.service';
import { Suspension4taApiService } from '../../../../../../../empleados/services/suspension4ta-api.service';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-import-masiva-ir4ta',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, MatCardModule, MatTooltipModule, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-masiva-ir4ta.html',
  styleUrl: './import-masiva-ir4ta.scss',
})
export class ImportMasivaIr4taComponent {
  private readonly suspension4taApi = inject(Suspension4taApiService);
  private readonly errorMessage = inject(ErrorMessageService);
  private readonly snackBar = inject(MatSnackBar);

  readonly fileToUpload = signal<File | null>(null);
  readonly isUploading = signal(false);
  readonly report = signal<any | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileToUpload.set(input.files[0]);
      this.report.set(null);
    }
  }

  removeFile(): void {
    this.fileToUpload.set(null);
    this.report.set(null);
  }

  upload(): void {
    const file = this.fileToUpload();
    if (!file) return;

    this.isUploading.set(true);
    this.report.set(null);

    this.suspension4taApi.importarMasivo(file).subscribe({
      next: (res: any) => {
        this.isUploading.set(false);
        this.report.set(res);
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading.set(false);
        const msg = err.error?.message || err.message;
        const translated = this.errorMessage.translate(msg);
        this.snackBar.open(translated, 'Cerrar', { duration: 5000 });
      },
    });
  }
}
