import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AgendaPresidenciaService,
  DetalleEventoPresidencia,
  ReportePresidencia,
  TipoReportePresidencia,
} from '../../core/services/agenda-presidencia.service';
import { fechaCorta } from '../../shared/estatus/estatus';

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

/**
 * "Agenda general" y "Agenda comisiones" listas para imprimir o guardar como PDF desde el
 * navegador (en Laravel se generaban con DomPDF).
 */
@Component({
  selector: 'app-agenda-presidencia-imprimir',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './agenda-presidencia-imprimir.html',
  styleUrl: './agenda-presidencia-imprimir.scss',
})
export class AgendaPresidenciaImprimir {
  protected readonly reporte = signal<ReportePresidencia | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly fechaCorta = fechaCorta;

  constructor(agendaService: AgendaPresidenciaService, route: ActivatedRoute) {
    const q = route.snapshot.queryParamMap;
    const tipo: TipoReportePresidencia = q.get('tipo') === 'comisiones' ? 'comisiones' : 'general';
    const sede = q.get('sede');
    agendaService
      .reporte(tipo, q.get('desde') ?? '', q.get('hasta'), sede ? Number(sede) : null)
      .subscribe({
        next: (r) => this.reporte.set(r),
        error: () => this.error.set('No se pudo generar la agenda. Revisa el periodo indicado.'),
      });
  }

  imprimir(): void {
    window.print();
  }

  /** "2026-10-01" -> "Jueves 1 de octubre de 2026". */
  diaLargo(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const d = new Date(Date.UTC(anio, mes - 1, dia));
    return `${DIAS[d.getUTCDay()]} ${dia} de ${MESES[mes - 1]} de ${anio}`;
  }

  horario(e: DetalleEventoPresidencia): string {
    if (!e.horaInicio || e.horaInicio === '00:00') return 'Todo el día';
    return e.horaTermino ? `${e.horaInicio} – ${e.horaTermino}` : e.horaInicio;
  }
}
