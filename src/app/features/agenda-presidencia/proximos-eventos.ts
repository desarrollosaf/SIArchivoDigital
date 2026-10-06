import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  PresidenciaService,
  ProximoEvento,
  ProximosEventos as Respuesta,
} from '../../core/services/presidencia.service';
import { ToastService } from '../../core/services/toast.service';
import { abrirArchivo } from '../../shared/abrir-archivo';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
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
 * Eventos (serie EVENTOS) del día siguiente, para preparar la jornada; se pueden consultar otros
 * días e imprimir la lista (Laravel: "Próximos eventos" y su PDF).
 */
@Component({
  selector: 'app-proximos-eventos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './proximos-eventos.html',
  styleUrl: './proximos-eventos.scss',
})
export class ProximosEventos {
  protected readonly datos = signal<Respuesta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly fecha = signal('');

  constructor(
    private readonly presidenciaService: PresidenciaService,
    private readonly toastService: ToastService,
    private readonly http: HttpClient,
  ) {
    this.cargar(null);
  }

  cambiarFecha(fecha: string): void {
    this.fecha.set(fecha);
    if (fecha) this.cargar(fecha);
  }

  /** "2026-10-07" -> "miércoles 7 de octubre de 2026". */
  diaLargo(fecha: string): string {
    const [a, m, d] = fecha.split('-').map(Number);
    const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
    return `${DIAS[dia]} ${d} de ${MESES[m - 1]} de ${a}`;
  }

  horario(e: ProximoEvento): string {
    if (!e.horaInicio || e.horaInicio === '00:00') return 'Sin hora';
    return e.horaTermino && e.horaTermino !== '00:00'
      ? `${e.horaInicio} – ${e.horaTermino}`
      : e.horaInicio;
  }

  verArchivo(e: ProximoEvento): void {
    abrirArchivo(this.http, this.presidenciaService.urlArchivoEvento(e.id), () =>
      this.toastService.error('No se encontró el documento de este evento.'),
    );
  }

  imprimir(): void {
    window.print();
  }

  private cargar(fecha: string | null): void {
    this.cargando.set(true);
    this.presidenciaService.proximosEventos(fecha).subscribe({
      next: (r) => {
        this.datos.set(r);
        this.fecha.set(r.fecha);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudieron cargar los eventos.');
      },
    });
  }
}
