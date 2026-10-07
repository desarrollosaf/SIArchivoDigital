import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CatalogosLegislativos,
  Disponibilidad,
  EventoLegislativo,
  EventosLegislativosService,
  Reprogramacion,
} from '../../core/services/agenda-presidencia.service';
import { Persona } from '../../core/services/catalogos.service';
import { ToastService } from '../../core/services/toast.service';
import { Modal } from '../../shared/modal/modal';
import { PersonaPicker } from '../../shared/persona-picker/persona-picker';
import { fechaCorta } from '../../shared/estatus/estatus';
import { fechaHoyMexico } from '../../shared/utils/fecha-mexico';

const TIPO_SESION = 1;
const TIPO_COMISION = 2;
const TIPO_COMPARECENCIA = 3;

interface Formulario {
  id: number | null;
  fechaEvento: string;
  /** Opcional: si se indica, el evento se repite cada día hasta esta fecha. */
  fechaFin: string;
  horaInicio: string;
  horaTermino: string;
  tipoEvento: number | null;
  sede: number | null;
  modalidad: number | null;
  tipoReunion: number | null;
  nombreEvento: string;
  materia: string;
  comisiones: Persona[];
}

function vacio(): Formulario {
  return {
    id: null,
    fechaEvento: fechaHoyMexico(),
    fechaFin: '',
    horaInicio: '',
    horaTermino: '',
    tipoEvento: null,
    sede: null,
    modalidad: null,
    tipoReunion: null,
    nombreEvento: '',
    materia: '',
    comisiones: [],
  };
}

/** Reprogramación en captura: nueva fecha (y horario/sede si cambian) y el motivo u oficio. */
interface FormReprogramar {
  evento: EventoLegislativo;
  fechaEvento: string;
  fechaFin: string;
  horaInicio: string;
  horaTermino: string;
  sede: number;
  motivo: string;
}

function mensajeError(err: HttpErrorResponse, porDefecto: string): string {
  const mensaje = (err.error as { message?: string | string[] } | null)?.message;
  if (Array.isArray(mensaje)) return mensaje.join(' · ');
  return mensaje || porDefecto;
}

/**
 * Captura de eventos legislativos de Presidencia (en Laravel: RegistroPresidencia). Los campos
 * dependen del tipo de evento, igual que en el formulario original.
 */
@Component({
  selector: 'app-eventos-legislativos',
  standalone: true,
  imports: [FormsModule, Modal, PersonaPicker],
  templateUrl: './eventos-legislativos.html',
  styleUrl: './eventos-legislativos.scss',
})
export class EventosLegislativos {
  protected readonly anio = signal(Number(fechaHoyMexico().slice(0, 4)));
  protected readonly anios = Array.from(
    { length: Number(fechaHoyMexico().slice(0, 4)) - 2024 + 2 },
    (_, i) => Number(fechaHoyMexico().slice(0, 4)) + 1 - i,
  );
  protected readonly eventos = signal<EventoLegislativo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly catalogos = signal<CatalogosLegislativos | null>(null);
  protected readonly formulario = signal<Formulario | null>(null);
  protected readonly guardando = signal(false);
  protected readonly disponibilidad = signal<Disponibilidad | null>(null);
  protected readonly fechaCorta = fechaCorta;
  protected readonly hoy = fechaHoyMexico();

  protected readonly opcionesComision = computed<Persona[]>(() =>
    (this.catalogos()?.comisiones ?? []).map((c) => ({ id: c.id, nombre: c.nombre })),
  );
  protected readonly esComision = computed(() => this.formulario()?.tipoEvento === TIPO_COMISION);
  protected readonly pideMateria = computed(() => {
    const tipo = this.formulario()?.tipoEvento;
    return tipo != null && tipo !== TIPO_SESION;
  });
  protected readonly materiaObligatoria = computed(() => {
    const tipo = this.formulario()?.tipoEvento;
    return tipo === TIPO_COMISION || tipo === TIPO_COMPARECENCIA;
  });

  protected readonly reprogramando = signal<FormReprogramar | null>(null);
  protected readonly dispReprogramar = signal<Disponibilidad | null>(null);

  private readonly revisarSede$ = new Subject<Formulario>();
  private readonly revisarReprogramar$ = new Subject<FormReprogramar>();

  constructor(
    private readonly eventosService: EventosLegislativosService,
    private readonly toastService: ToastService,
  ) {
    eventosService.catalogos().subscribe({
      next: (c) => this.catalogos.set(c),
      error: () => this.toastService.error('No se pudieron cargar los catálogos.'),
    });
    this.cargar();

    // Igual que Laravel al cambiar la sede: avisa en cuanto el horario choca con otro evento.
    this.revisarSede$
      .pipe(
        debounceTime(300),
        switchMap((f) =>
          this.eventosService.disponibilidad(
            f.fechaEvento,
            f.horaInicio,
            f.horaTermino,
            f.sede!,
            f.id,
            f.fechaFin || null,
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (d) => this.disponibilidad.set(d),
        error: () => this.disponibilidad.set(null),
      });

    this.revisarReprogramar$
      .pipe(
        debounceTime(300),
        switchMap((r) =>
          this.eventosService.disponibilidad(
            r.fechaEvento,
            r.horaInicio,
            r.horaTermino,
            r.sede,
            r.evento.id,
            r.fechaFin || null,
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (d) => this.dispReprogramar.set(d),
        error: () => this.dispReprogramar.set(null),
      });
  }

  /** "06/10/2026" o "12/10/2026 al 16/10/2026". */
  fechas(e: EventoLegislativo): string {
    return e.fechaFin && e.fechaFin !== e.fechaEvento
      ? `${fechaCorta(e.fechaEvento)} al ${fechaCorta(e.fechaFin)}`
      : fechaCorta(e.fechaEvento);
  }

  /** "14/10/2026 (10:00–12:00, Salón de Protocolos)". */
  antes(r: Reprogramacion): string {
    const fecha =
      r.fechaFinAnterior && r.fechaFinAnterior !== r.fechaAnterior
        ? `${fechaCorta(r.fechaAnterior)} al ${fechaCorta(r.fechaFinAnterior)}`
        : fechaCorta(r.fechaAnterior);
    const detalle = [
      r.horaInicioAnterior ? `${r.horaInicioAnterior}–${r.horaTerminoAnterior}` : null,
      r.sedeAnterior,
    ].filter(Boolean);
    return detalle.length ? `${fecha} (${detalle.join(', ')})` : fecha;
  }

  reprogramar(e: EventoLegislativo): void {
    this.dispReprogramar.set(null);
    this.reprogramando.set({
      evento: e,
      fechaEvento: '',
      fechaFin: '',
      horaInicio: e.horaInicio ?? '',
      horaTermino: e.horaTermino ?? '',
      sede: e.sede.id,
      motivo: '',
    });
  }

  actualizarReprogramar(cambios: Partial<FormReprogramar>): void {
    this.reprogramando.update((r) => (r ? { ...r, ...cambios } : r));
    const r = this.reprogramando();
    if (r?.fechaEvento && r.horaInicio && r.horaTermino && r.horaTermino > r.horaInicio) {
      this.revisarReprogramar$.next(r);
    } else {
      this.dispReprogramar.set(null);
    }
  }

  guardarReprogramacion(): void {
    const r = this.reprogramando();
    if (!r) return;
    if (!r.fechaEvento) return this.toastService.error('Indica la nueva fecha.');
    if (r.fechaEvento < this.hoy)
      return this.toastService.error('La nueva fecha no puede ser anterior a hoy.');
    if (r.fechaFin && r.fechaFin < r.fechaEvento)
      return this.toastService.error('La fecha final no puede ser anterior a la nueva fecha.');
    if (!r.horaInicio || !r.horaTermino || r.horaTermino <= r.horaInicio)
      return this.toastService.error('Revisa el horario: el término debe ser posterior al inicio.');
    if (!r.motivo.trim())
      return this.toastService.error('Indica el motivo u oficio de la reprogramación.');
    if (this.dispReprogramar()?.disponible === false)
      return this.toastService.error('La sede no está disponible en la nueva fecha.');
    this.guardando.set(true);
    this.eventosService
      .reprogramar(r.evento.id, {
        fechaEvento: r.fechaEvento,
        fechaFin: r.fechaFin && r.fechaFin !== r.fechaEvento ? r.fechaFin : null,
        horaInicio: r.horaInicio,
        horaTermino: r.horaTermino,
        sede: r.sede,
        motivo: r.motivo.trim(),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.reprogramando.set(null);
          this.toastService.success(`Evento reprogramado al ${fechaCorta(r.fechaEvento)}.`);
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.toastService.error(mensajeError(err, 'No se pudo reprogramar el evento.'));
        },
      });
  }

  cambiarAnio(anio: number): void {
    this.anio.set(Number(anio));
    this.cargar();
  }

  nuevo(): void {
    this.disponibilidad.set(null);
    this.formulario.set(vacio());
  }

  editar(e: EventoLegislativo): void {
    this.disponibilidad.set(null);
    this.formulario.set({
      id: e.id,
      fechaEvento: e.fechaEvento,
      fechaFin: e.fechaFin ?? '',
      horaInicio: e.horaInicio ?? '',
      horaTermino: e.horaTermino ?? '',
      tipoEvento: e.tipoEvento.id,
      sede: e.sede.id,
      modalidad: e.modalidad.id,
      tipoReunion: e.tipoReunion.id,
      nombreEvento: e.nombreEvento ?? '',
      materia: e.materia ?? '',
      comisiones: e.comisiones.map((c) => ({ id: c.id, nombre: c.nombre })),
    });
    this.revisar();
  }

  actualizar(cambios: Partial<Formulario>): void {
    this.formulario.update((f) => (f ? { ...f, ...cambios } : f));
    if (
      ['fechaEvento', 'fechaFin', 'horaInicio', 'horaTermino', 'sede'].some((k) => k in cambios)
    ) {
      this.revisar();
    }
  }

  guardar(): void {
    const f = this.formulario();
    if (!f) return;
    const falta = this.faltantes(f);
    if (falta) {
      this.toastService.error(falta);
      return;
    }
    this.guardando.set(true);
    this.eventosService
      .guardar(f.id, {
        fechaEvento: f.fechaEvento,
        fechaFin: f.fechaFin && f.fechaFin !== f.fechaEvento ? f.fechaFin : null,
        horaInicio: f.horaInicio,
        horaTermino: f.horaTermino,
        tipoEvento: f.tipoEvento!,
        sede: f.sede!,
        modalidad: f.modalidad!,
        tipoReunion: this.esComision() ? f.tipoReunion : null,
        nombreEvento: f.nombreEvento.trim(),
        materia: this.pideMateria() ? f.materia.trim() || null : null,
        comisiones: this.esComision() ? f.comisiones.map((c) => c.id) : [],
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.formulario.set(null);
          this.toastService.success(
            f.id ? 'Evento actualizado.' : 'Evento registrado y agregado a la agenda.',
          );
          this.cargar();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.toastService.error(mensajeError(err, 'No se pudo guardar el evento.'));
        },
      });
  }

  eliminar(e: EventoLegislativo): void {
    void Swal.fire({
      title: '¿Eliminar este evento?',
      text: `${e.tipoEvento.nombre} del ${fechaCorta(e.fechaEvento)} se quitará también de la agenda.`,
      icon: 'warning',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-danger)',
      cancelButtonColor: 'var(--brand-muted)',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.eventosService.eliminar(e.id).subscribe({
        next: () => {
          this.toastService.success('Evento eliminado.');
          this.cargar();
        },
        error: () => this.toastService.error('No se pudo eliminar el evento.'),
      });
    });
  }

  private revisar(): void {
    const f = this.formulario();
    if (f?.fechaEvento && f.horaInicio && f.horaTermino && f.sede && f.horaTermino > f.horaInicio) {
      this.revisarSede$.next(f);
    } else {
      this.disponibilidad.set(null);
    }
  }

  private faltantes(f: Formulario): string | null {
    if (f.fechaFin && f.fechaFin < f.fechaEvento) {
      return 'La fecha final no puede ser anterior a la fecha del evento.';
    }
    if (!f.fechaEvento || !f.horaInicio || !f.horaTermino) return 'Indica la fecha y el horario.';
    if (f.horaTermino <= f.horaInicio)
      return 'La hora de término debe ser posterior a la de inicio.';
    if (!f.id && f.fechaEvento < this.hoy) return 'No se pueden agendar eventos con fecha pasada.';
    if (!f.tipoEvento || !f.sede || !f.modalidad)
      return 'Selecciona tipo de evento, sede y modalidad.';
    if (!f.nombreEvento.trim()) return 'Captura el nombre del evento.';
    if (this.esComision() && f.comisiones.length === 0) return 'Selecciona al menos una comisión.';
    if (this.esComision() && !f.tipoReunion) return 'Selecciona el tipo de reunión.';
    if (this.materiaObligatoria() && !f.materia.trim()) return 'Captura la materia del evento.';
    if (this.disponibilidad()?.disponible === false)
      return 'La sede no está disponible en ese horario.';
    return null;
  }

  private cargar(): void {
    this.cargando.set(true);
    this.eventosService.listar(this.anio()).subscribe({
      next: (rows) => {
        this.eventos.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudieron cargar los eventos.');
      },
    });
  }
}
