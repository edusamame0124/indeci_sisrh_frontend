import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { AsistenciaApiService } from '../../services/asistencia-api.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import { TIPOS_DIA, type AsistenciaDia, type TipoDia } from '../../models/asistencia.model';

/** Opción del selector de empleado (SPEC §12.2 PANTALLA-02). */
interface EmpleadoOpcion {
  readonly empleadoId: number;
  readonly nombre: string;
  readonly dni: string;
}

/** Resultado visible tras importar CSV (éxito parcial). */
interface ResultadoImportCsv {
  readonly aplicados: number;
  readonly omitidos: readonly CsvFilaFallida[];
}

/** Fila del CSV rechazada con motivo operativo. */
interface CsvFilaFallida {
  readonly linea: number;
  readonly contenido: string;
  readonly motivo: string;
}

/** Resumen de la asistencia cargada (SPEC §12.2 PANTALLA-02). */
interface ResumenAsistencia {
  readonly diasLaborados: number;
  readonly diasFalta: number;
  readonly totalMinTardanza: number;
  readonly descuentoTardanza: number;
  readonly descuentoFalta: number;
  readonly totalDescuento: number;
}

/** Tipos que cuentan como día efectivamente laborado. */
const TIPOS_LABORADOS: ReadonlySet<TipoDia> = new Set<TipoDia>(['LABORAL', 'TARDANZA']);

/**
 * PANTALLA-02 — Carga de Asistencia (SPEC §12.2, ROL_RRHH).
 *
 * Calendario mensual visual por empleado y período: cada día tiene un tipo
 * (LABORAL / FALTA / TARDANZA / LICENCIA / VACACIONES / DESCANSO) y minutos de
 * tardanza. El descuento se calcula en tiempo real según D.Leg. 276 Art. 24
 * (REGLA 276-02). Permite import masivo desde CSV.
 *
 * El selector de empleado se alimenta de `GET /api/rrhh/persona` (toda persona
 * con vínculo de empleado), independiente de que exista o no planilla generada.
 */
@Component({
  selector: 'app-carga-asistencia-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './carga-asistencia-page.component.html',
  styleUrl: './carga-asistencia-page.component.css',
})
export class CargaAsistenciaPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly asistenciaApi = inject(AsistenciaApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  /** Días de la semana (lunes a domingo) para el encabezado de la grilla. */
  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
  readonly tiposDia = TIPOS_DIA;

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly empleados = signal<readonly EmpleadoOpcion[]>([]);
  readonly empleadoSeleccionado = signal<number | null>(null);

  readonly dias = signal<readonly AsistenciaDia[]>([]);
  readonly remuneracionBase = signal<number | null>(null);
  readonly observacion = signal<string>('');
  readonly estadoAsistencia = signal<string>('BORRADOR');

  readonly loading = signal(true);
  readonly cargandoEmpleados = signal(true);
  readonly cargandoCalendario = signal(false);
  readonly guardando = signal(false);
  readonly calendarioListo = signal(false);
  readonly arrastrando = signal(false);
  readonly resultadoImport = signal<ResultadoImportCsv | null>(null);

  readonly periodoActivo = computed(() => {
    const sel = this.periodoSeleccionado();
    if (sel == null) return null;
    return this.periodos().find((p) => p.periodo === sel) ?? null;
  });

  /** Resumen en tiempo real — descuento según D.Leg. 276 Art. 24 (REGLA 276-02). */
  readonly resumen = computed<ResumenAsistencia>(() => {
    let diasLaborados = 0;
    let diasFalta = 0;
    let totalMinTardanza = 0;
    for (const d of this.dias()) {
      if (TIPOS_LABORADOS.has(d.tipoDia)) diasLaborados++;
      if (d.tipoDia === 'FALTA') diasFalta++;
      if (d.tipoDia === 'TARDANZA') totalMinTardanza += Math.max(0, d.minutosTardanza);
    }
    const remun = this.remuneracionBase() ?? 0;
    const descuentoTardanza = this.round2((remun * totalMinTardanza) / (30 * 8 * 60));
    const descuentoFalta = this.round2((remun * diasFalta) / 30);
    return {
      diasLaborados,
      diasFalta,
      totalMinTardanza,
      descuentoTardanza,
      descuentoFalta,
      totalDescuento: this.round2(descuentoTardanza + descuentoFalta),
    };
  });

  /** Días agrupados en semanas (lunes a domingo) para la grilla de calendario. */
  readonly semanas = computed<readonly (AsistenciaDia | null)[][]>(() => {
    const lista = this.dias();
    if (lista.length === 0) return [];
    const offset = this.weekdayMon(this.parseYmd(lista[0].dia));
    const celdas: (AsistenciaDia | null)[] = [
      ...Array<AsistenciaDia | null>(offset).fill(null),
      ...lista,
    ];
    while (celdas.length % 7 !== 0) celdas.push(null);
    const semanas: (AsistenciaDia | null)[][] = [];
    for (let i = 0; i < celdas.length; i += 7) {
      semanas.push(celdas.slice(i, i + 7));
    }
    return semanas;
  });

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarEmpleados();
  }

  // ============ Selección período / empleado ============

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.dias.set([]);
    this.calendarioListo.set(false);
    this.resultadoImport.set(null);
    if (this.empleadoSeleccionado() != null) {
      this.cargarAsistencia();
    }
  }

  onEmpleadoChange(empleadoId: number): void {
    this.empleadoSeleccionado.set(empleadoId);
    this.cargarAsistencia();
  }

  // ============ Edición del calendario ============

  /** Cicla el tipo de día (LABORAL → TARDANZA → FALTA → … → DESCANSO → LABORAL). */
  cycleTipo(dia: AsistenciaDia): void {
    const idx = this.tiposDia.indexOf(dia.tipoDia);
    const siguiente = this.tiposDia[(idx + 1) % this.tiposDia.length];
    this.setTipo(dia, siguiente);
  }

  setTipo(dia: AsistenciaDia, tipo: TipoDia): void {
    this.dias.update((lista) =>
      lista.map((d) =>
        d.dia === dia.dia
          ? { ...d, tipoDia: tipo, minutosTardanza: tipo === 'TARDANZA' ? d.minutosTardanza : 0 }
          : d,
      ),
    );
  }

  onMinutos(dia: AsistenciaDia, valor: number | string): void {
    const minutos = Math.max(0, Math.trunc(Number(valor) || 0));
    this.dias.update((lista) =>
      lista.map((d) => (d.dia === dia.dia ? { ...d, minutosTardanza: minutos } : d)),
    );
  }

  /** Clase CSS del semáforo de color por tipo de día. */
  claseDia(tipo: TipoDia): string {
    return `cal-dia--${tipo.toLowerCase()}`;
  }

  // ============ Import CSV (SPEC §12.2 — import masivo) ============

  onArchivoCsv(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void file.text().then((texto) => this.importarCsv(texto));
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void file.text().then((texto) => this.importarCsv(texto));
    }
  }

  abrirSelectorCsv(input: HTMLInputElement): void {
    input.click();
  }

  /**
   * Aplica un CSV `fecha,tipo,minutos` sobre el calendario cargado.
   * Las filas cuya fecha no pertenece al período se ignoran.
   */
  importarCsv(texto: string): void {
    if (this.dias().length === 0) {
      this.snack.open('Seleccione período y empleado antes de importar.', 'Cerrar', {
        duration: 5000,
      });
      return;
    }
    const validos = new Set<string>(this.tiposDia);
    const fechasPeriodo = new Set<string>(this.dias().map((d) => d.dia));
    const cambios = new Map<string, { tipo: TipoDia; minutos: number }>();
    const omitidos: CsvFilaFallida[] = [];
    const lineas = texto.split(/\r?\n/);

    for (let i = 0; i < lineas.length; i++) {
      const cruda = lineas[i].trim();
      if (cruda.length === 0 || cruda.toLowerCase().startsWith('fecha')) continue;

      const partes = cruda.split(/[,;]/).map((p) => p.trim());
      if (partes.length < 2) {
        omitidos.push({
          linea: i + 1,
          contenido: cruda,
          motivo: 'Formato inválido — use fecha,tipo,minutos',
        });
        continue;
      }

      const fecha = partes[0];
      const tipo = partes[1].toUpperCase();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        omitidos.push({
          linea: i + 1,
          contenido: cruda,
          motivo: 'Fecha inválida — use AAAA-MM-DD',
        });
        continue;
      }
      if (!fechasPeriodo.has(fecha)) {
        omitidos.push({
          linea: i + 1,
          contenido: cruda,
          motivo: 'La fecha no pertenece al período seleccionado',
        });
        continue;
      }
      if (!validos.has(tipo)) {
        omitidos.push({
          linea: i + 1,
          contenido: cruda,
          motivo: 'Tipo de día no reconocido',
        });
        continue;
      }

      const minutos = Math.max(0, Math.trunc(Number(partes[2]) || 0));
      cambios.set(fecha, { tipo: tipo as TipoDia, minutos });
    }

    if (cambios.size === 0 && omitidos.length === 0) {
      this.resultadoImport.set(null);
      this.snack.open('El CSV no tiene filas válidas (fecha,tipo,minutos).', 'Cerrar', {
        duration: 6000,
      });
      return;
    }

    if (cambios.size > 0) {
      this.dias.update((lista) =>
        lista.map((d) => {
          const c = cambios.get(d.dia);
          if (!c) return d;
          return {
            ...d,
            tipoDia: c.tipo,
            minutosTardanza: c.tipo === 'TARDANZA' ? c.minutos : 0,
          };
        }),
      );
    }

    this.resultadoImport.set({ aplicados: cambios.size, omitidos });

    if (cambios.size > 0 && omitidos.length === 0) {
      this.snack.open(`${cambios.size} día(s) actualizado(s) desde CSV.`, 'Cerrar', {
        duration: 4000,
      });
    } else if (cambios.size > 0) {
      this.snack.open(
        `${cambios.size} día(s) importado(s). ${omitidos.length} fila(s) omitida(s).`,
        'Cerrar',
        { duration: 6000 },
      );
    } else {
      this.snack.open('Ninguna fila pudo importarse. Revise el detalle de errores.', 'Cerrar', {
        duration: 6000,
      });
    }
  }

  // ============ Guardar ============

  guardar(): void {
    const empleadoId = this.empleadoSeleccionado();
    const periodo = this.periodoSeleccionado();
    if (empleadoId == null || periodo == null) return;

    this.guardando.set(true);
    this.asistenciaApi
      .guardar({
        empleadoId,
        periodo,
        remuneracionBase: this.remuneracionBase(),
        observacion: this.observacion().trim() || null,
        estado: this.estadoAsistencia(),
        dias: this.dias(),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.snack.open('Asistencia guardada.', 'Cerrar', { duration: 4000 });
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.onHttpSnack(err);
        },
      });
  }

  fmtMonto(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  // ============ Carga de datos ============

  private cargarPeriodos(): void {
    this.loading.set(true);
    this.periodoApi.listar().subscribe({
      next: (rows) => {
        const ordenados = [...rows].sort((a, b) => b.periodo.localeCompare(a.periodo));
        this.periodos.set(ordenados);
        this.loading.set(false);
        const inicial = ordenados.find((p) => p.estado === 'ABIERTO') ?? ordenados[0];
        if (inicial) this.onPeriodoChange(inicial.periodo);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  private cargarEmpleados(): void {
    this.cargandoEmpleados.set(true);
    this.personaApi.listar().subscribe({
      next: (personas) => {
        const opciones = personas
          .filter((p) => p.empleadoId != null)
          .map<EmpleadoOpcion>((p) => ({
            empleadoId: p.empleadoId as number,
            nombre: p.nombreCompleto,
            dni: p.dni,
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.empleados.set(opciones);
        this.cargandoEmpleados.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoEmpleados.set(false);
        this.empleados.set([]);
        this.onHttpSnack(err);
      },
    });
  }

  private cargarAsistencia(): void {
    const empleadoId = this.empleadoSeleccionado();
    const periodo = this.periodoActivo();
    if (empleadoId == null || periodo == null) return;

    this.cargandoCalendario.set(true);
    this.calendarioListo.set(false);
    this.asistenciaApi.obtener(empleadoId, periodo.periodo).subscribe({
      next: (resp) => {
        this.remuneracionBase.set(resp.remuneracionBase);
        this.observacion.set(resp.observacion ?? '');
        this.estadoAsistencia.set(resp.estado || 'BORRADOR');
        this.dias.set(
          this.construirCalendario(periodo.fechaInicio, periodo.fechaFin, resp.dias),
        );
        this.cargandoCalendario.set(false);
        this.calendarioListo.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoCalendario.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  /**
   * Arma el calendario del período: un día por fecha entre inicio y fin.
   * Usa los días ya guardados; el resto: fin de semana → DESCANSO, resto → LABORAL.
   */
  private construirCalendario(
    fechaInicio: string,
    fechaFin: string,
    guardados: readonly AsistenciaDia[],
  ): AsistenciaDia[] {
    const previos = new Map<string, AsistenciaDia>(guardados.map((d) => [d.dia, d]));
    const dias: AsistenciaDia[] = [];
    const fin = this.parseYmd(fechaFin);
    for (let cursor = this.parseYmd(fechaInicio); cursor <= fin; cursor.setDate(cursor.getDate() + 1)) {
      const clave = this.toYmd(cursor);
      const previo = previos.get(clave);
      if (previo) {
        dias.push({ ...previo });
      } else {
        const finDeSemana = cursor.getDay() === 0 || cursor.getDay() === 6;
        dias.push({
          dia: clave,
          tipoDia: finDeSemana ? 'DESCANSO' : 'LABORAL',
          minutosTardanza: 0,
          observacion: null,
        });
      }
    }
    return dias;
  }

  // ============ Helpers ============

  /** Número de día dentro del mes (para mostrar en la celda). */
  numeroDia(dia: AsistenciaDia): number {
    return this.parseYmd(dia.dia).getDate();
  }

  private parseYmd(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private toYmd(date: Date): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Día de la semana con lunes = 0 … domingo = 6. */
  private weekdayMon(date: Date): number {
    return (date.getDay() + 6) % 7;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private onHttpSnack(err: HttpErrorResponse): void {
    const body = err.error;
    const msg = isErrorResponse(body)
      ? this.errors.translate(body.mensaje)
      : this.errors.translate(null);
    this.snack.open(msg, 'Cerrar', { duration: 7000 });
  }
}
