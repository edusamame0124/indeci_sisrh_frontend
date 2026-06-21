import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
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
import { PeriodoPlanillaApiService } from '../../../planilla/services/periodo-planilla-api.service';
import { PersonaApiService } from '../../../empleados/services/persona-api.service';
import { AsistenciaApiService } from '../../services/asistencia-api.service';
import { AsistenciaTabService } from '../../services/asistencia-tab.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import type { PeriodoPlanillaRow } from '../../../planilla/models/periodo-planilla.model';
import {
  ESTADOS_ASISTENCIA,
  TIPOS_DIA,
  type AsistenciaDia,
  type EstadoAsistencia,
  type TipoDia,
} from '../../models/asistencia.model';

/** OpciÃ³n del selector de empleado (SPEC Â§12.2 PANTALLA-02). */
interface EmpleadoOpcion {
  readonly empleadoId: number;
  readonly nombre: string;
  readonly dni: string;
}

/** Resumen de la asistencia cargada (SPEC Â§12.2 PANTALLA-02). */
interface ResumenAsistencia {
  readonly diasLaborados: number;
  readonly diasFalta: number;
  readonly totalMinTardanza: number;
  readonly descuentoTardanza: number;
  readonly descuentoFalta: number;
  readonly totalDescuento: number;
}

/** Tipos que cuentan como dÃ­a efectivamente laborado. */
const TIPOS_LABORADOS: ReadonlySet<TipoDia> = new Set<TipoDia>(['LABORAL', 'TARDANZA']);

/**
 * PANTALLA-02 â€” Carga de Asistencia (SPEC Â§12.2, ROL_RRHH).
 *
 * Calendario mensual visual por empleado y perÃ­odo: cada dÃ­a tiene un tipo
 * (LABORAL / FALTA / TARDANZA / LICENCIA / VACACIONES / DESCANSO) y minutos de
 * tardanza. El descuento se calcula en tiempo real segÃºn D.Leg. 276 Art. 24
 * (REGLA 276-02). La importaciÃ³n masiva del marcador vive en una pestaÃ±a separada.
 *
 * El selector de empleado se alimenta de `GET /api/rrhh/persona` (toda persona
 * con vÃ­nculo de empleado), independiente de que exista o no planilla generada.
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './carga-asistencia-page.component.html',
  styleUrl: './carga-asistencia-page.component.css',
})
export class CargaAsistenciaPageComponent implements OnInit {
  private readonly periodoApi = inject(PeriodoPlanillaApiService);
  private readonly personaApi = inject(PersonaApiService);
  private readonly asistenciaApi = inject(AsistenciaApiService);
  private readonly tabs = inject(AsistenciaTabService);
  private readonly snack = inject(MatSnackBar);
  private readonly errors = inject(ErrorMessageService);

  /** DÃ­as de la semana (lunes a domingo) para el encabezado de la grilla. */
  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
  readonly tiposDia = TIPOS_DIA;
  readonly estadosAsistencia = ESTADOS_ASISTENCIA;

  readonly periodos = signal<readonly PeriodoPlanillaRow[]>([]);
  readonly periodoSeleccionado = signal<string | null>(null);
  readonly empleados = signal<readonly EmpleadoOpcion[]>([]);
  readonly empleadoSeleccionado = signal<number | null>(null);

  readonly dias = signal<readonly AsistenciaDia[]>([]);
  readonly remuneracionBase = signal<number | null>(null);
  readonly observacion = signal<string>('');
  readonly estadoAsistencia = signal<EstadoAsistencia>('BORRADOR');

  readonly loading = signal(true);
  readonly cargandoEmpleados = signal(true);
  readonly cargandoCalendario = signal(false);
  readonly guardando = signal(false);
  readonly calendarioListo = signal(false);
  readonly descargandoPdf = signal(false);
  readonly recalculando = signal(false);

  readonly periodoActivo = computed(() => {
    const sel = this.periodoSeleccionado();
    if (sel == null) return null;
    return this.periodos().find((p) => p.periodo === sel) ?? null;
  });

  /** Resumen en tiempo real â€” descuento segÃºn D.Leg. 276 Art. 24 (REGLA 276-02). */
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

  /** DÃ­as agrupados en semanas (lunes a domingo) para la grilla de calendario. */
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

  readonly puedeDescargarPdf = computed(
    () =>
      this.empleadoSeleccionado() != null &&
      this.periodoSeleccionado() != null &&
      this.calendarioListo(),
  );

  constructor() {
    // Preselección reactiva al navegar desde "Carga masiva" (botón "Ver asistencia cargada").
    // Usa effects porque esta pestaña se inicializa una sola vez (las tabs persisten).
    effect(
      () => {
        const periodo = this.tabs.preselectPeriodo();
        if (periodo == null || !this.periodos().some((p) => p.periodo === periodo)) {
          return;
        }
        this.tabs.preselectPeriodo.set(null);
        if (this.periodoSeleccionado() !== periodo) {
          this.onPeriodoChange(periodo);
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const empleadoId = this.tabs.preselectEmpleadoId();
        if (empleadoId == null || !this.empleados().some((e) => e.empleadoId === empleadoId)) {
          return;
        }
        this.tabs.preselectEmpleadoId.set(null);
        this.onEmpleadoChange(empleadoId);
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarEmpleados();
  }

  // ============ SelecciÃ³n perÃ­odo / empleado ============

  onPeriodoChange(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.dias.set([]);
    this.calendarioListo.set(false);
    if (this.empleadoSeleccionado() != null) {
      this.cargarAsistencia();
    }
  }

  onEmpleadoChange(empleadoId: number): void {
    this.empleadoSeleccionado.set(empleadoId);
    this.cargarAsistencia();
  }

  // ============ EdiciÃ³n del calendario ============

  /** Cicla el tipo de dÃ­a (LABORAL â†’ TARDANZA â†’ FALTA â†’ â€¦ â†’ DESCANSO â†’ LABORAL). */
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

  onMinutosInput(dia: AsistenciaDia, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.onMinutos(dia, input.value);
  }

  /** Clase CSS del semÃ¡foro de color por tipo de dÃ­a. */
  claseDia(tipo: TipoDia): string {
    return `cal-dia--${tipo.toLowerCase()}`;
  }

  /** Descuento referencial del día (D.Leg. 276 Art. 24). 0 si el día no descuenta. */
  descuentoDia(dia: AsistenciaDia): number {
    const remun = this.remuneracionBase() ?? 0;
    if (dia.tipoDia === 'TARDANZA') {
      return this.round2((remun * Math.max(0, dia.minutosTardanza)) / (30 * 8 * 60));
    }
    if (dia.tipoDia === 'FALTA') {
      return this.round2(remun / 30);
    }
    return 0;
  }

  /** Tooltip del día con el descuento referencial cuando aplica. */
  tooltipDia(dia: AsistenciaDia): string {
    const base = `${dia.dia} — ${dia.tipoDia} (clic para cambiar)`;
    const desc = this.descuentoDia(dia);
    return desc > 0 ? `${base} · Descuento S/ ${this.fmtMonto(desc)}` : base;
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

  /**
   * Recalcula la tardanza/descuentos del empleado desde las marcas y la jornada vigente,
   * sin pasar por "Validar cabeceras". Refresca el calendario al terminar.
   */
  recalcular(): void {
    const empleadoId = this.empleadoSeleccionado();
    const periodo = this.periodoSeleccionado();
    if (empleadoId == null || periodo == null) return;

    this.recalculando.set(true);
    this.asistenciaApi.recalcular(empleadoId, periodo).subscribe({
      next: () => {
        this.recalculando.set(false);
        this.snack.open('Asistencia recalculada con la jornada vigente.', 'Cerrar', { duration: 4000 });
        this.cargarAsistencia();
      },
      error: (err: HttpErrorResponse) => {
        this.recalculando.set(false);
        this.onHttpSnack(err);
      },
    });
  }

  /** Descarga el PDF vía blob (lleva el JWT por el interceptor; el href directo no lo haría). */
  descargarPdf(): void {
    const empleadoId = this.empleadoSeleccionado();
    const periodo = this.periodoSeleccionado();
    if (empleadoId == null || periodo == null) return;

    this.descargandoPdf.set(true);
    this.asistenciaApi.descargarPdf(empleadoId, periodo).subscribe({
      next: (blob) => {
        this.descargandoPdf.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `asistencia-${empleadoId}-${periodo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => {
        this.descargandoPdf.set(false);
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
            dni: p.dni ?? '',
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
   * Arma el calendario del perÃ­odo: un dÃ­a por fecha entre inicio y fin.
   * Usa los dÃ­as ya guardados; el resto: fin de semana â†’ DESCANSO, resto â†’ LABORAL.
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

  /** NÃºmero de dÃ­a dentro del mes (para mostrar en la celda). */
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

  /** DÃ­a de la semana con lunes = 0 â€¦ domingo = 6. */
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

