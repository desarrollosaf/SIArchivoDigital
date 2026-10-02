import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConsultasService, EventoAgenda } from '../../core/services/consultas.service';
import {
  CalendarioMensual,
  EventoCalendario,
  RangoCalendario,
} from '../../shared/calendario-mensual/calendario-mensual';
import { fechaCorta } from '../../shared/estatus/estatus';

/** Fechas límite de los documentos propios y turnados (tabla `agendas`). */
@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [RouterLink, CalendarioMensual],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
})
export class AgendaCalendario {
  protected readonly eventos = signal<EventoAgenda[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);
  protected readonly diaSeleccionado = signal<string | null>(null);
  protected readonly fechaCorta = fechaCorta;

  protected readonly eventosCalendario = computed<EventoCalendario[]>(() =>
    this.eventos().map((e) => ({
      id: e.id,
      fecha: e.inicio.slice(0, 10),
      hora: this.horaInicio(e),
      titulo: e.titulo,
      color: e.color,
    })),
  );

  protected readonly eventosDelDia = computed(() => {
    const dia = this.diaSeleccionado();
    return dia ? this.eventos().filter((e) => e.inicio.startsWith(dia)) : [];
  });

  constructor(
    private readonly consultasService: ConsultasService,
    private readonly router: Router,
  ) {}

  cargar(rango: RangoCalendario): void {
    this.cargando.set(true);
    this.error.set(false);
    this.consultasService.agenda(rango.desde, rango.hasta).subscribe({
      next: (rows) => {
        this.eventos.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
  }

  abrirEvento(id: number): void {
    const evento = this.eventos().find((e) => e.id === id);
    if (evento) void this.router.navigate(['/documentos', evento.registroId]);
  }

  horario(evento: EventoAgenda): string {
    const inicio = this.horaInicio(evento);
    return inicio ? `${inicio}–${evento.fin.slice(11, 16)}` : 'Todo el día';
  }

  private horaInicio(evento: EventoAgenda): string | null {
    const inicio = evento.inicio.slice(11, 16);
    return inicio === '00:00' ? null : inicio;
  }
}
