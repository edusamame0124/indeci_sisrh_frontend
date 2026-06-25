import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AsistenciaEmpleadoApiService } from '../../services/asistencia-empleado-api';
import {
  DiaCalendarioAsistenciaEmpleado,
  EstadoDiaAsistenciaEmpleado,
  MiAsistenciaEmpleado,
} from '../../models/asistencia-empleado.model';

@Component({
  selector: 'app-mis-asistencias-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './mis-asistencias-page.html',
  styleUrl: './mis-asistencias-page.scss',
})
export class MisAsistenciasPage implements OnInit {
  private readonly asistenciaApi = inject(AsistenciaEmpleadoApiService);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly asistencias = signal<MiAsistenciaEmpleado[]>([]);

  readonly fechaVista = signal(new Date());

  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  private readonly cachePorMes = new Map<string, MiAsistenciaEmpleado[]>();
  readonly leyenda: {
    estado: EstadoDiaAsistenciaEmpleado;
    label: string;
    className: string;
  }[] = [
    { estado: 'LABORAL', label: 'Laboral', className: 'laboral' },
    { estado: 'TARDANZA', label: 'Tardanza', className: 'tardanza' },
    { estado: 'FALTA', label: 'Falta', className: 'falta' },
    { estado: 'LICENCIA', label: 'Licencia', className: 'licencia' },
    { estado: 'VACACIONES', label: 'Vacaciones', className: 'vacaciones' },
    { estado: 'DESCANSO', label: 'Descanso', className: 'descanso' },
    { estado: 'FERIADO', label: 'Feriado', className: 'feriado' },
    { estado: 'OBSERVADO', label: 'Observado', className: 'observado' },
  ];

  readonly tituloMes = computed(() => {
    const fecha = this.fechaVista();

    return new Intl.DateTimeFormat('es-PE', {
      month: 'long',
      year: 'numeric',
    }).format(fecha);
  });

  readonly diasCalendario = computed(() =>
    this.construirCalendario(this.fechaVista(), this.asistencias()),
  );

  ngOnInit(): void {
    this.cargarAsistencias();
  }

  cargarAsistencias(): void {
    this.error.set(null);

    const rango = this.obtenerRangoMes(this.fechaVista());
    const cacheKey = `${rango.fechaInicio}_${rango.fechaFin}`;

    const dataCache = this.cachePorMes.get(cacheKey);
    console.log('RANGO ANGULAR:', rango);
    if (dataCache) {
      this.asistencias.set(dataCache);
      return;
    }

    this.cargando.set(true);

    this.asistenciaApi.listarMisAsistencias(rango.fechaInicio, rango.fechaFin).subscribe({
      next: (resp: any) => {
        console.log('RESPUESTA COMPLETA:', resp);
        console.log('DATA:', resp?.data);
        console.log('CONTENT:', resp?.data?.content);
        const lista: MiAsistenciaEmpleado[] = Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.data)
            ? resp.data
            : [];

        this.cachePorMes.set(cacheKey, lista);
        this.asistencias.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error cargando mis asistencias:', err);
        this.error.set('No se pudieron cargar sus asistencias.');
        this.asistencias.set([]);
        this.cargando.set(false);
      },
    });
  }

  obtenerClaseDia(dia: DiaCalendarioAsistenciaEmpleado): string {
    return [
      'dia-card',
      dia.mesActual ? 'mes-actual' : 'otro-mes',
      this.claseEstado(dia.estado),
    ].join(' ');
  }

  claseEstado(estado: EstadoDiaAsistenciaEmpleado): string {
    return estado.toLowerCase().replace('_', '-');
  }

  obtenerMinutosTardanza(item?: MiAsistenciaEmpleado | null): number {
    return item?.minutosTardanza ?? item?.tardanzaMinutos ?? 0;
  }

  obtenerMontoDescuento(item?: MiAsistenciaEmpleado | null): number {
    return item?.montoDescuento ?? item?.descuento ?? 0;
  }

  private construirCalendario(
    fechaVista: Date,
    asistencias: MiAsistenciaEmpleado[],
  ): DiaCalendarioAsistenciaEmpleado[] {
    const listaAsistencias = Array.isArray(asistencias) ? asistencias : [];
    const anio = fechaVista.getFullYear();
    const mes = fechaVista.getMonth();

    const primeroMes = new Date(anio, mes, 1);

    const inicioCalendario = new Date(primeroMes);
    const diaSemanaInicio = this.obtenerDiaSemanaLunesPrimero(primeroMes);

    inicioCalendario.setDate(primeroMes.getDate() - diaSemanaInicio);

    const asistenciasPorFecha = new Map<string, MiAsistenciaEmpleado>();

    for (const asistencia of listaAsistencias) {
      if (asistencia.fecha) {
        asistenciasPorFecha.set(asistencia.fecha.substring(0, 10), asistencia);
      }
    }

    const dias: DiaCalendarioAsistenciaEmpleado[] = [];
    const totalCeldas = 42;

    for (let i = 0; i < totalCeldas; i++) {
      const fecha = new Date(inicioCalendario);
      fecha.setDate(inicioCalendario.getDate() + i);

      const fechaTexto = this.formatearFechaLocal(fecha);
      const asistencia = asistenciasPorFecha.get(fechaTexto) ?? null;

      dias.push({
        fecha: fechaTexto,
        dia: fecha.getDate(),
        mesActual: fecha.getMonth() === mes,
        estado: this.obtenerEstadoDia(fecha, asistencia),
        asistencia,
      });
    }

    return dias;
  }

  private obtenerEstadoDia(
    fecha: Date,
    asistencia?: MiAsistenciaEmpleado | null,
  ): EstadoDiaAsistenciaEmpleado {
    if (asistencia) {
      const estadoRaw =
        asistencia.tipoDia ??
        asistencia.estadoAsistencia ??
        asistencia.estado ??
        asistencia.tipo ??
        '';

      const estado = estadoRaw.toString().trim().toUpperCase().replaceAll(' ', '_');

      if (estado.includes('TARDANZA')) return 'TARDANZA';
      if (estado.includes('FALTA')) return 'FALTA';
      if (estado.includes('LICENCIA')) return 'LICENCIA';
      if (estado.includes('VACACION')) return 'VACACIONES';
      if (estado.includes('DESCANSO')) return 'DESCANSO';
      if (estado.includes('FERIADO')) return 'FERIADO';
      if (estado.includes('OBSERV')) return 'OBSERVADO';
      if (estado.includes('LABORAL')) return 'LABORAL';

      if (this.obtenerMinutosTardanza(asistencia) > 0) {
        return 'TARDANZA';
      }

      return 'LABORAL';
    }

    const diaSemana = fecha.getDay();

    if (diaSemana === 0 || diaSemana === 6) {
      return 'DESCANSO';
    }

    return 'SIN_REGISTRO';
  }

  private obtenerDiaSemanaLunesPrimero(fecha: Date): number {
    const dia = fecha.getDay();

    return dia === 0 ? 6 : dia - 1;
  }

  private formatearFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private obtenerRangoMes(fecha: Date): { fechaInicio: string; fechaFin: string } {
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth();

    const inicio = new Date(anio, mes, 1);
    const fin = new Date(anio, mes + 1, 0);

    return {
      fechaInicio: this.formatearFechaLocal(inicio),
      fechaFin: this.formatearFechaLocal(fin),
    };
  }
  mesAnterior(): void {
    const actual = this.fechaVista();
    this.fechaVista.set(new Date(actual.getFullYear(), actual.getMonth() - 1, 1));
    this.cargarAsistencias();
  }

  mesSiguiente(): void {
    const actual = this.fechaVista();
    this.fechaVista.set(new Date(actual.getFullYear(), actual.getMonth() + 1, 1));
    this.cargarAsistencias();
  }

  irMesActual(): void {
    this.fechaVista.set(new Date());
    this.cargarAsistencias();
  }
}
