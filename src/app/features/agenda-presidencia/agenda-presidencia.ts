import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AgendaPresidenciaService,
  DetalleEventoPresidencia,
  EventoPresidencia,
  SedePresidencia,
  TipoReportePresidencia,
} from '../../core/services/agenda-presidencia.service';
import { ToastService } from '../../core/services/toast.service';
import {
  CalendarioMensual,
  EventoCalendario,
  RangoCalendario,
} from '../../shared/calendario-mensual/calendario-mensual';
import { Modal } from '../../shared/modal/modal';
import { fechaCorta } from '../../shared/estatus/estatus';

/**
 * Agenda legislativa de Presidencia (en Laravel: /agendaPresidencia). Calendario con los eventos
 * de la serie EVENTOS y los legislativos, filtro por sede y los reportes "Agenda general" y
 * "Agenda comisiones".
 */
@Component({
  selector: 'app-agenda-presidencia',
  standalone: true,
  imports: [FormsModule, RouterLink, CalendarioMensual, Modal],
  templateUrl: './agenda-presidencia.html',
  styleUrl: './agenda-presidencia.scss',
})
export class AgendaPresidencia {
  protected readonly sedes = signal<SedePresidencia[]>([]);
  protected readonly fechaInicial = signal('');
  protected readonly fechaFinal = signal('');
  protected readonly sede = signal<number | null>(null);

  protected readonly eventos = signal<EventoPresidencia[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);
  protected readonly diaSeleccionado = signal<string | null>(null);
  protected readonly detalle = signal<DetalleEventoPresidencia | null>(null);
  protected readonly fechaCorta = fechaCorta;

  private rango: RangoCalendario | null = null;

  protected readonly eventosCalendario = computed<EventoCalendario[]>(() =>
    this.eventos().map((e) => ({
      id: e.id,
      fecha: e.fecha,
      hora: e.inicio?.slice(11, 16) ?? null,
      titulo: e.titulo,
      color: e.color,
    })),
  );

  protected readonly eventosDelDia = computed(() => {
    const dia = this.diaSeleccionado();
    return dia ? this.eventos().filter((e) => e.fecha === dia) : [];
  });

  constructor(
    private readonly agendaService: AgendaPresidenciaService,
    private readonly toastService: ToastService,
    private readonly router: Router,
  ) {
    agendaService.sedes().subscribe((s) => this.sedes.set(s));
  }

  cargar(rango: RangoCalendario): void {
    this.rango = rango;
    this.cargando.set(true);
    this.error.set(false);
    this.agendaService.eventos(rango.desde, rango.hasta, this.sede()).subscribe({
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

  onSede(sede: number | null): void {
    this.sede.set(sede);
    if (this.rango) this.cargar(this.rango);
  }

  verDetalle(id: number): void {
    this.agendaService.detalle(id).subscribe({
      next: (d) => this.detalle.set(d),
      error: () => this.toastService.error('No se pudo cargar el detalle del evento.'),
    });
  }

  /** Una hoja por día con la ocupación de salones y los eventos (no usa el filtro de sede). */
  detallada(): void {
    if (!this.fechaInicial()) {
      this.toastService.error('Indica al menos la fecha inicial.');
      return;
    }
    if (this.fechaFinal() && this.fechaFinal() < this.fechaInicial()) {
      this.toastService.error('La fecha final no puede ser anterior a la inicial.');
      return;
    }
    void this.router.navigate(['/presidencia/agenda/detallada'], {
      queryParams: { desde: this.fechaInicial(), hasta: this.fechaFinal() || null },
    });
  }

  imprimir(tipo: TipoReportePresidencia): void {
    if (!this.fechaInicial()) {
      this.toastService.error('Indica al menos la fecha inicial.');
      return;
    }
    if (this.fechaFinal() && this.fechaFinal() < this.fechaInicial()) {
      this.toastService.error('La fecha final no puede ser anterior a la inicial.');
      return;
    }
    void this.router.navigate(['/presidencia/agenda/imprimir'], {
      queryParams: {
        tipo,
        desde: this.fechaInicial(),
        hasta: this.fechaFinal() || null,
        sede: this.sede(),
      },
    });
  }

  horario(e: { horaInicio: string | null; horaTermino: string | null }): string {
    if (!e.horaInicio || e.horaInicio === '00:00') return 'Todo el día';
    return e.horaTermino ? `${e.horaInicio}–${e.horaTermino}` : e.horaInicio;
  }

  horarioEvento(e: EventoPresidencia): string {
    return this.horario({
      horaInicio: e.inicio?.slice(11, 16) ?? null,
      horaTermino: e.fin?.slice(11, 16) ?? null,
    });
  }
}
