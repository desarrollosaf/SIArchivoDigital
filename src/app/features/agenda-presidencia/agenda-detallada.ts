import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AgendaDetallada as Agenda,
  AgendaPresidenciaService,
  CategoriaEvento,
  EventoDetallado,
  SedePresidencia,
} from '../../core/services/agenda-presidencia.service';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Ventana de la gráfica de ocupación: de 07:00 a 20:00. */
const INICIO_MIN = 7 * 60;
const FIN_MIN = 20 * 60;
const HORAS = Array.from({ length: 13 }, (_, i) => String(7 + i).padStart(2, '0'));
/** Palacio Legislativo: se muestra como fila de recorridos, no como salón. */
const SEDE_PALACIO = 1;

export const CATEGORIAS: { clave: CategoriaEvento; nombre: string }[] = [
  { clave: 'comision', nombre: 'Comisión' },
  { clave: 'sesion', nombre: 'Sesión' },
  { clave: 'evento', nombre: 'Evento' },
  { clave: 'visita', nombre: 'Visita guiada' },
  { clave: 'comedor', nombre: 'Comedor' },
  { clave: 'foraneo', nombre: 'Foráneo' },
];

interface Barra {
  evento: EventoDetallado;
  izquierda: number;
  ancho: number;
  /** El texto cabe dentro de la barra; si no, va a su derecha. */
  textoDentro: boolean;
  /** Espacio (en %) para el texto a la derecha, hasta la siguiente barra; 0 = no se muestra. */
  anchoFuera: number;
}

interface FilaSalon {
  nombre: string;
  recorridos: boolean;
  barras: Barra[];
  libreTodoElDia: boolean;
  libre: string;
  seLibero: string | null;
}

interface FilaEvento {
  evento: EventoDetallado;
  lugar: string;
  /** Texto complementario, solo si no repite el título. */
  detalle: string | null;
  nota: string | null;
}

interface Pagina {
  fecha: string;
  salonesConUso: number;
  totalSalones: number;
  eventosRecinto: number;
  recorridos: number;
  cancelados: EventoDetallado[];
  /** Eventos que estaban este día y se movieron a otra fecha. */
  reprogramados: EventoDetallado[];
  libresTodoElDia: string[];
  filas: FilaSalon[];
  eventos: FilaEvento[];
}

/**
 * "Agenda detallada": una hoja horizontal por día con la ocupación de cada salón (de 07:00 a
 * 20:00), sus horarios libres y la lista de eventos, incluidos los cancelados.
 */
@Component({
  selector: 'app-agenda-detallada',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './agenda-detallada.html',
  styleUrl: './agenda-detallada.scss',
})
export class AgendaDetallada {
  protected readonly paginas = signal<Pagina[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly horas = HORAS;
  protected readonly categorias = CATEGORIAS;

  constructor(agendaService: AgendaPresidenciaService, route: ActivatedRoute) {
    const q = route.snapshot.queryParamMap;
    agendaService.detallada(q.get('desde') ?? '', q.get('hasta')).subscribe({
      next: (a) => this.paginas.set(armarPaginas(a)),
      error: (e: { error?: { message?: string } }) =>
        this.error.set(
          e.error?.message ?? 'No se pudo generar la agenda. Revisa el periodo indicado.',
        ),
    });
  }

  imprimir(): void {
    window.print();
  }

  /** "2026-10-05" -> "Lunes 5 de octubre de 2026". */
  diaLargo(fecha: string): string {
    const [a, m, d] = fecha.split('-').map(Number);
    const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
    return `${DIAS[dia]} ${d} de ${MESES[m - 1]} de ${a}`;
  }

  nombreCategoria(e: EventoDetallado): string {
    if (e.cancelado) return 'Cancelado';
    if (e.reprogramadoA) return 'Reprogramado';
    return CATEGORIAS.find((c) => c.clave === e.categoria)?.nombre ?? 'Evento';
  }

  horario(e: EventoDetallado): string {
    if (!e.horaInicio) return 'Sin hora';
    return e.horaTermino ? `${e.horaInicio} a ${e.horaTermino}` : e.horaInicio;
  }

  /** " (Salón X queda libre de 10:00 a 11:00)", o vacío si el evento no tenía sede u hora. */
  queLiberaCancelado(e: EventoDetallado): string {
    if (!e.sede || !e.horaInicio) return '';
    const fin = e.horaTermino ? ` a ${e.horaTermino}` : '';
    return ` (${e.sede} queda libre de ${e.horaInicio}${fin})`;
  }

  /** Clase de color: cancelado y reprogramado tienen la suya; los demás, la de su tipo. */
  clase(e: EventoDetallado): string {
    if (e.cancelado) return 'cancelado';
    if (e.reprogramadoA) return 'reprogramado';
    return e.categoria;
  }

  /** "2026-10-21" -> "miércoles 21 de octubre". */
  diaCorto(fecha: string): string {
    const largo = this.diaLargo(fecha);
    return largo.charAt(0).toLowerCase() + largo.slice(1).replace(/ de \d{4}$/, '');
  }

  /** "2026-10-05 09:40" -> "el 5 de octubre a las 09:40". */
  cuandoSeCancelo(e: EventoDetallado): string {
    if (!e.canceladoEl) return '';
    const [fecha, hora] = e.canceladoEl.split(' ');
    const [, m, d] = fecha.split('-').map(Number);
    return `el ${d} de ${MESES[m - 1]} a las ${hora}`;
  }
}

// ---- Armado de cada hoja ---------------------------------------------------------------------

function armarPaginas(agenda: Agenda): Pagina[] {
  const salones = agenda.salones;
  return agenda.dias.map((dia) => {
    const activos = dia.eventos.filter((e) => !e.cancelado && !e.reprogramadoA);
    const cancelados = dia.eventos.filter((e) => e.cancelado);
    const reprogramados = dia.eventos.filter((e) => e.reprogramadoA);

    const filas: FilaSalon[] = salones.map((s) =>
      filaSalon(nombreCorto(s.nombre), false, s, dia.eventos),
    );
    const recorridos = dia.eventos.filter((e) => e.sedeId === SEDE_PALACIO);
    if (recorridos.length) {
      filas.push(
        filaSalon(
          'Recorridos por el Palacio',
          true,
          { id: SEDE_PALACIO } as SedePresidencia,
          dia.eventos,
        ),
      );
    }

    return {
      fecha: dia.fecha,
      salonesConUso: filas.filter((f) => !f.recorridos && !f.libreTodoElDia).length,
      totalSalones: salones.length,
      eventosRecinto: activos.filter((e) => e.categoria !== 'foraneo').length,
      recorridos: activos.filter((e) => e.sedeId === SEDE_PALACIO).length,
      cancelados,
      reprogramados,
      libresTodoElDia: filas.filter((f) => !f.recorridos && f.libreTodoElDia).map((f) => f.nombre),
      filas,
      eventos: dia.eventos.map((e) => ({
        evento: e,
        lugar: lugar(e),
        detalle: e.detalle && normalizar(e.detalle) !== normalizar(e.titulo) ? e.detalle : null,
        nota: e.cancelado || e.reprogramadoA ? null : mismoEventoEn(e, activos),
      })),
    };
  });
}

function filaSalon(
  nombre: string,
  recorridos: boolean,
  salon: SedePresidencia,
  eventos: EventoDetallado[],
): FilaSalon {
  const propios = eventos.filter((e) => e.sedeId === salon.id && e.horaInicio);
  const barras = propios
    .map((e) => {
      const ini = Math.max(minutos(e.horaInicio!), INICIO_MIN);
      const fin = Math.min(minutos(e.horaTermino ?? e.horaInicio!) || ini + 30, FIN_MIN);
      if (fin <= INICIO_MIN || ini >= FIN_MIN) return null;
      const izquierda = ((ini - INICIO_MIN) / (FIN_MIN - INICIO_MIN)) * 100;
      const ancho = Math.max(((Math.max(fin, ini + 15) - ini) / (FIN_MIN - INICIO_MIN)) * 100, 1.5);
      return {
        evento: e,
        izquierda,
        ancho,
        textoDentro: ancho >= 16,
        anchoFuera: 0,
      } satisfies Barra;
    })
    .filter((b): b is Barra => b !== null)
    .sort((a, b) => a.izquierda - b.izquierda);
  // El texto de una barra corta va a su derecha, pero sin encimarse con la barra siguiente.
  barras.forEach((b, i) => {
    if (b.textoDentro) return;
    const limite = barras[i + 1]?.izquierda ?? 100;
    const espacio = limite - (b.izquierda + b.ancho) - 0.6;
    b.anchoFuera = espacio >= 5 ? Math.min(espacio, 32) : 0;
  });

  const ocupados = propios
    .filter((e) => !e.cancelado && !e.reprogramadoA)
    .map((e) => [
      minutos(e.horaInicio!),
      minutos(e.horaTermino ?? e.horaInicio!) || minutos(e.horaInicio!) + 30,
    ]);
  const libres = huecos(ocupados);
  const liberados = propios.filter((e) => (e.cancelado || e.reprogramadoA) && e.horaTermino);
  return {
    nombre,
    recorridos,
    barras,
    libreTodoElDia: ocupados.length === 0,
    libre: libres.map(([a, b]) => `${hhmm(a)}–${hhmm(b)}`).join(', ') || 'Sin horario libre',
    seLibero: liberados.length
      ? 'Se liberó ' + liberados.map((e) => `${e.horaInicio}–${e.horaTermino}`).join(', ')
      : null,
  };
}

/** Horarios libres entre 07:00 y 20:00, dados los ocupados (en minutos). */
function huecos(ocupados: number[][]): [number, number][] {
  const orden = ocupados
    .map(([a, b]) => [Math.max(a, INICIO_MIN), Math.min(b, FIN_MIN)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const libres: [number, number][] = [];
  let cursor = INICIO_MIN;
  for (const [a, b] of orden) {
    if (a > cursor) libres.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < FIN_MIN) libres.push([cursor, FIN_MIN]);
  return libres;
}

/** Si el mismo evento (mismo nombre y horario) ocupa otras sedes, se avisa en la lista. */
function mismoEventoEn(e: EventoDetallado, activos: EventoDetallado[]): string | null {
  const otros = activos.filter(
    (o) =>
      o.id !== e.id &&
      o.sedeId !== e.sedeId &&
      o.horaInicio === e.horaInicio &&
      o.horaTermino === e.horaTermino &&
      normalizar(o.titulo) === normalizar(e.titulo),
  );
  if (otros.length === 0) return null;
  return `El mismo evento está reservado también en ${otros.map((o) => o.sede ?? 'otra sede').join(', ')}.`;
}

function lugar(e: EventoDetallado): string {
  if (!e.sede) return 'Sin sede';
  return e.sedeId === SEDE_PALACIO ? `${e.sede} (recorrido)` : e.sede;
}

/** Nombre corto para la gráfica: 'Salón "Benito Juárez"' -> 'Benito Juárez', etc. */
function nombreCorto(nombre: string): string {
  const salon = /^Salón "(.+)"$/.exec(nombre);
  if (salon) return salon[1];
  if (nombre.startsWith('Salón de Plenos')) return 'Salón de Plenos';
  const biblioteca = /^Biblioteca del Poder Legislativo \((.+)\)$/.exec(nombre);
  if (biblioteca) return `Biblioteca, ${biblioteca[1].toLowerCase()}`;
  return nombre.replace(/\s*\(.*\)$/, '');
}

function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
