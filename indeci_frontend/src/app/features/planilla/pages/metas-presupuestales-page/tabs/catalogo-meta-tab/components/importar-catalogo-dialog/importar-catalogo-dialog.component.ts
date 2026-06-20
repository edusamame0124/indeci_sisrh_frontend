import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MetaPptoApiService } from '../../../../../../services/meta-ppto-api.service';
import { ErrorMessageService } from '../../../../../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../../../../../core/models/error-response.model';
import type { MetaPptoCat, MetaPptoCatDto } from '../../../../../../models/meta-ppto.model';

export interface ImportarCatalogoDialogData {
  anioFiscal: number;
  metasExistentes: MetaPptoCat[];
}

export interface FilaImportada {
  metaCodigo: string;
  centroCosto: string;
  categoriaPresupuestal: string;
  producto: string;
  actividad: string;
  finalidad: string;
  fuente: string;
  esNueva: boolean;
  esDuplicadoEnExcel: boolean;
}

export interface ResumenImportacion {
  filasLeidas: number;
  metasUnicas: number;
  metasNuevas: number;
  metasReutilizadas: number;
  duplicadosInformativos: number;
}

type PasoImport = 'seleccionar' | 'preview' | 'resultado';

/** Normaliza un texto: trim + uppercase */
function normalizar(s: string): string {
  return (s ?? '').trim().toUpperCase();
}

/** Clave única: Opción A — META_CODIGO + ANIO_FISCAL */
function claveUnica(metaCodigo: string, anioFiscal: number): string {
  return `${anioFiscal}::${normalizar(metaCodigo)}`;
}

/** Parsea CSV simple (coma o punto y coma como separador) */
function parsearCsv(texto: string): Record<string, string>[] {
  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lineas.length < 2) return [];

  const separador = lineas[0].includes(';') ? ';' : ',';
  const encabezados = lineas[0].split(separador).map(h => h.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quitar tildes
    .replace(/\s+/g, '_'));

  return lineas.slice(1).map(linea => {
    const celdas = linea.split(separador);
    return encabezados.reduce<Record<string, string>>((obj, h, i) => {
      obj[h] = (celdas[i] ?? '').trim();
      return obj;
    }, {});
  });
}

/** Mapea un objeto CSV a los campos requeridos (tolerante a variantes de nombre de columna) */
function mapearFila(fila: Record<string, string>): Partial<MetaPptoCatDto> {
  const g = (keys: string[]): string => {
    for (const k of keys) if (fila[k]) return fila[k].trim();
    return '';
  };
  return {
    metaCodigo:            g(['meta', 'meta_codigo', 'metacodigo', 'cod_meta', 'codigo_meta']),
    centroCosto:           g(['centro_de_costo', 'centrocosto', 'centro_costo', 'cc']),
    categoriaPresupuestal: g(['categoria_presupuestal', 'categoria', 'cat_presupuestal']),
    producto:              g(['producto']),
    actividad:             g(['actividad']),
    finalidad:             g(['finalidad']),
    fuente:                g(['fuente', 'fuente_financiamiento']),
  };
}

@Component({
  selector: 'app-importar-catalogo-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './importar-catalogo-dialog.component.html',
  styleUrl: './importar-catalogo-dialog.component.css',
})
export class ImportarCatalogoDialogComponent {
  private readonly api    = inject(MetaPptoApiService);
  private readonly snack  = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);
  private readonly fb     = inject(FormBuilder);

  readonly paso              = signal<PasoImport>('seleccionar');
  readonly cargando          = signal(false);
  readonly archivoNombre     = signal('');
  readonly errorArchivo      = signal('');
  readonly filasPreview      = signal<FilaImportada[]>([]);
  readonly resumen           = signal<ResumenImportacion | null>(null);
  readonly resultadoFinal    = signal<{ exitosos: number; omitidos: number } | null>(null);

  readonly form = this.fb.nonNullable.group({
    sobreescribir: [false],
  });

  readonly columnasPreview = [
    'metaCodigo', 'centroCosto', 'categoriaPresupuestal',
    'producto', 'actividad', 'finalidad', 'tipo',
  ] as const;

  filasParaEnviar: MetaPptoCatDto[] = [];

  constructor(
    public readonly dialogRef: MatDialogRef<ImportarCatalogoDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ImportarCatalogoDialogData,
  ) {}

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    if (!archivo.name.toLowerCase().endsWith('.csv')) {
      this.errorArchivo.set('Solo se aceptan archivos .CSV. Guarde su Excel como CSV (UTF-8) desde "Archivo → Guardar como".');
      return;
    }
    this.errorArchivo.set('');
    this.archivoNombre.set(archivo.name);
    this.cargando.set(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const texto = e.target?.result as string;
      this.procesarTexto(texto);
      this.cargando.set(false);
    };
    reader.readAsText(archivo, 'UTF-8');
  }

  private procesarTexto(texto: string): void {
    const filasCrudas = parsearCsv(texto);
    if (filasCrudas.length === 0) {
      this.errorArchivo.set('El archivo está vacío o no tiene el formato esperado.');
      return;
    }

    const clavesExistentes = new Set(
      this.data.metasExistentes.map(m => claveUnica(m.metaCodigo, this.data.anioFiscal)),
    );

    const vistas = new Map<string, FilaImportada>();
    let duplicadosInformativos = 0;

    for (const fila of filasCrudas) {
      const mapeada = mapearFila(fila);
      if (!mapeada.metaCodigo) continue;

      const clave = claveUnica(mapeada.metaCodigo, this.data.anioFiscal);

      if (vistas.has(clave)) {
        duplicadosInformativos++;
        continue; // fusionar: ignorar la fila repetida
      }

      const esNueva = !clavesExistentes.has(clave);
      vistas.set(clave, {
        metaCodigo:            normalizar(mapeada.metaCodigo ?? ''),
        centroCosto:           (mapeada.centroCosto ?? '').trim(),
        categoriaPresupuestal: (mapeada.categoriaPresupuestal ?? '').trim(),
        producto:              (mapeada.producto ?? '').trim(),
        actividad:             (mapeada.actividad ?? '').trim(),
        finalidad:             (mapeada.finalidad ?? '').trim(),
        fuente:                (mapeada.fuente ?? '').trim(),
        esNueva,
        esDuplicadoEnExcel: false,
      });
    }

    const filas = Array.from(vistas.values());
    const metasNuevas       = filas.filter(f => f.esNueva).length;
    const metasReutilizadas = filas.filter(f => !f.esNueva).length;

    this.filasPreview.set(filas);
    this.resumen.set({
      filasLeidas:            filasCrudas.length,
      metasUnicas:            filas.length,
      metasNuevas,
      metasReutilizadas,
      duplicadosInformativos,
    });

    // Solo las metas nuevas se enviarán al backend (o todas si sobreescribir=true)
    this.filasParaEnviar = filas
      .filter(f => f.esNueva)
      .map(f => ({
        anioFiscal:            this.data.anioFiscal,
        metaCodigo:            f.metaCodigo,
        centroCosto:           f.centroCosto,
        categoriaPresupuestal: f.categoriaPresupuestal,
        producto:              f.producto,
        actividad:             f.actividad,
        finalidad:             f.finalidad,
        fuente:                f.fuente || null,
      }));

    this.paso.set('preview');
  }

  confirmarImportacion(): void {
    if (this.cargando() || this.filasParaEnviar.length === 0) return;
    this.cargando.set(true);
    const sobreescribir = this.form.getRawValue().sobreescribir;

    this.api.importarCatalogo(this.data.anioFiscal, this.filasParaEnviar, sobreescribir).subscribe({
      next: (metasCreadas) => {
        this.cargando.set(false);
        this.resultadoFinal.set({ exitosos: metasCreadas.length, omitidos: this.resumen()?.metasReutilizadas ?? 0 });
        this.paso.set('resultado');
        this.snack.open(`${metasCreadas.length} metas importadas correctamente.`, 'Cerrar', { duration: 5000 });
      },
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        const body = err.error;
        const msg = isErrorResponse(body) ? this.errors.translate(body.mensaje) : this.errors.translate(null);
        this.snack.open(msg, 'Cerrar', { duration: 8000 });
      },
    });
  }

  cerrarConExito(): void { this.dialogRef.close(true); }
  cancelar(): void       { this.dialogRef.close(false); }
  volverASeleccionar(): void {
    this.paso.set('seleccionar');
    this.archivoNombre.set('');
    this.errorArchivo.set('');
    this.filasPreview.set([]);
    this.resumen.set(null);
    this.filasParaEnviar = [];
  }
}
