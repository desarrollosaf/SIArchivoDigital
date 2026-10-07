import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FiltroTurnos, TurnoBandeja, TurnosService } from '../../core/services/turnos.service';
import { BandejaPestanas } from '../../shared/bandeja/bandeja-pestanas';
import {
  ClasePrioridad,
  clasePrioridad,
  fechaHora,
  normalizar,
  plazo,
  POR_PAGINA,
} from '../../shared/bandeja/bandeja-util';
import { VistaRapida } from '../../shared/bandeja/vista-rapida';
import { FiltroAnioMes } from '../../shared/filtro-anio-mes/filtro-anio-mes';
import { Icono } from '../../shared/icono/icono';
import { Paginador } from '../../shared/paginador/paginador';

@Component({
  selector: 'app-bandeja-entrada',
  standalone: true,
  imports: [FormsModule, RouterLink, FiltroAnioMes, BandejaPestanas, Icono, Paginador, VistaRapida],
  templateUrl: './entrada.html',
})
export class BandejaEntrada {
  protected readonly filtro = signal<FiltroTurnos>('pendientes');
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly mes = signal<number | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly turnos = signal<TurnoBandeja[]>([]);
  protected readonly soloLectura = signal(false);
  protected readonly busqueda = signal('');
  protected readonly prioridad = signal<ClasePrioridad | null>(null);
  protected readonly pagina = signal(1);
  protected readonly abierto = signal<TurnoBandeja | null>(null);

  protected readonly fechaHora = fechaHora;
  protected readonly plazo = plazo;
  protected readonly clasePrioridad = clasePrioridad;

  protected readonly filtrados = computed(() => {
    const q = normalizar(this.busqueda().trim());
    const prio = this.prioridad();
    return this.turnos().filter(
      (t) =>
        (!prio || clasePrioridad(t.urgente) === prio) &&
        (!q ||
          normalizar(
            `${t.folio} ${t.referencia ?? ''} ${t.asunto} ${t.remitente} ${t.turnadoPor ?? ''}`,
          ).includes(q)),
    );
  });

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / POR_PAGINA)),
  );
  protected readonly visibles = computed(() =>
    this.filtrados().slice((this.pagina() - 1) * POR_PAGINA, this.pagina() * POR_PAGINA),
  );
  protected readonly desde = computed(() =>
    this.filtrados().length ? (this.pagina() - 1) * POR_PAGINA + 1 : 0,
  );
  protected readonly hasta = computed(() =>
    Math.min(this.pagina() * POR_PAGINA, this.filtrados().length),
  );

  constructor(private readonly turnosService: TurnosService) {
    // Al cambiar la búsqueda o la prioridad se vuelve a la primera página.
    effect(() => {
      this.busqueda();
      this.prioridad();
      this.pagina.set(1);
    });
    this.cargar();
  }

  cambiarFiltro(filtro: FiltroTurnos): void {
    if (this.filtro() === filtro) return;
    this.filtro.set(filtro);
    this.cargar();
  }

  alternarPrioridad(p: ClasePrioridad): void {
    this.prioridad.update((actual) => (actual === p ? null : p));
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.cargar();
  }

  onMesChange(mes: number | null): void {
    this.mes.set(mes);
    this.cargar();
  }

  /** Abrir el archivo marca el turno como visto en el servidor; se refleja aquí sin recargar. */
  marcarVisto(t: TurnoBandeja): void {
    if (t.visto || this.soloLectura()) return;
    this.turnos.update((lista) =>
      lista.map((x) => (x.id === t.id ? { ...x, visto: true, nuevo: false } : x)),
    );
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.pagina.set(1);
    // Los pendientes se muestran todos; los atendidos se filtran por periodo porque crecen sin fin.
    const atendidos = this.filtro() === 'atendidos';
    this.turnosService
      .listar(this.filtro(), atendidos ? this.anio() : undefined, atendidos ? this.mes() : null)
      .subscribe({
        next: (bandeja) => {
          this.turnos.set(bandeja.turnos);
          this.soloLectura.set(bandeja.soloLectura);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar tu bandeja de entrada.');
          this.cargando.set(false);
        },
      });
  }
}
