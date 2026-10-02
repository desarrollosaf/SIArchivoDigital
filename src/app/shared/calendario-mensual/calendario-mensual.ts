import { Component, OnInit, computed, input, output, signal } from '@angular/core';
import { fechaHoyMexico } from '../utils/fecha-mexico';

export interface EventoCalendario {
  id: number;
  /** YYYY-MM-DD */
  fecha: string;
  /** HH:mm, o null si dura todo el día. */
  hora: string | null;
  titulo: string;
  color: string;
}

export interface RangoCalendario {
  desde: string;
  hasta: string;
}

interface DiaCalendario {
  fecha: string;
  numero: number;
  delMes: boolean;
  hoy: boolean;
  eventos: EventoCalendario[];
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function iso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/**
 * Calendario mensual (lunes a domingo). Avisa con `rangoChange` qué fechas está mostrando para
 * que la página pida solo esos eventos. Las fechas se manejan en UTC para no brincar de día.
 */
@Component({
  selector: 'app-calendario-mensual',
  standalone: true,
  templateUrl: './calendario-mensual.html',
  styleUrl: './calendario-mensual.scss',
})
export class CalendarioMensual implements OnInit {
  readonly eventos = input<EventoCalendario[]>([]);
  readonly cargando = input(false);
  readonly error = input(false);
  readonly maxPorDia = input(3);

  readonly rangoChange = output<RangoCalendario>();
  readonly diaChange = output<string>();
  readonly eventoClick = output<number>();

  protected readonly diasSemana = DIAS_SEMANA;
  protected readonly hoy = fechaHoyMexico();
  protected readonly anio = signal(Number(this.hoy.slice(0, 4)));
  protected readonly mes = signal(Number(this.hoy.slice(5, 7)) - 1);
  protected readonly diaSeleccionado = signal<string | null>(this.hoy);

  protected readonly titulo = computed(() => `${MESES[this.mes()]} ${this.anio()}`);

  private readonly rango = computed(() => {
    const primero = new Date(Date.UTC(this.anio(), this.mes(), 1));
    const inicio = new Date(primero);
    inicio.setUTCDate(1 - ((primero.getUTCDay() + 6) % 7));
    const ultimo = new Date(Date.UTC(this.anio(), this.mes() + 1, 0));
    const fin = new Date(ultimo);
    fin.setUTCDate(ultimo.getUTCDate() + (6 - ((ultimo.getUTCDay() + 6) % 7)));
    return { inicio, fin };
  });

  protected readonly semanas = computed<DiaCalendario[][]>(() => {
    const { inicio, fin } = this.rango();
    const porDia = new Map<string, EventoCalendario[]>();
    for (const e of this.eventos()) {
      porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e]);
    }
    const semanas: DiaCalendario[][] = [];
    for (const d = new Date(inicio); d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
      if (semanas.length === 0 || semanas[semanas.length - 1].length === 7) semanas.push([]);
      const fecha = iso(d);
      semanas[semanas.length - 1].push({
        fecha,
        numero: d.getUTCDate(),
        delMes: d.getUTCMonth() === this.mes(),
        hoy: fecha === this.hoy,
        eventos: porDia.get(fecha) ?? [],
      });
    }
    return semanas;
  });

  ngOnInit(): void {
    this.avisarRango();
    this.diaChange.emit(this.hoy);
  }

  mover(delta: number): void {
    const fecha = new Date(Date.UTC(this.anio(), this.mes() + delta, 1));
    this.anio.set(fecha.getUTCFullYear());
    this.mes.set(fecha.getUTCMonth());
    this.avisarRango();
  }

  irAHoy(): void {
    this.anio.set(Number(this.hoy.slice(0, 4)));
    this.mes.set(Number(this.hoy.slice(5, 7)) - 1);
    this.elegirDia(this.hoy);
    this.avisarRango();
  }

  elegirDia(fecha: string): void {
    this.diaSeleccionado.set(fecha);
    this.diaChange.emit(fecha);
  }

  elegirEvento(event: Event, id: number): void {
    event.stopPropagation();
    this.eventoClick.emit(id);
  }

  private avisarRango(): void {
    const { inicio, fin } = this.rango();
    this.rangoChange.emit({ desde: iso(inicio), hasta: iso(fin) });
  }
}
