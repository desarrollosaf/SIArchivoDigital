import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  FiltroEstatus,
  RegistroListado,
  RegistrosService,
} from '../../../core/services/registros.service';
import { BandejaPestanas } from '../../../shared/bandeja/bandeja-pestanas';
import {
  ClasePrioridad,
  clasePrioridad,
  fechaHora,
  normalizar,
  plazo,
  POR_PAGINA,
} from '../../../shared/bandeja/bandeja-util';
import { VistaRapida } from '../../../shared/bandeja/vista-rapida';
import { FiltroAnioMes } from '../../../shared/filtro-anio-mes/filtro-anio-mes';
import { Icono } from '../../../shared/icono/icono';
import { Paginador } from '../../../shared/paginador/paginador';

@Component({
  selector: 'app-salida-lista',
  standalone: true,
  imports: [FormsModule, RouterLink, FiltroAnioMes, BandejaPestanas, Icono, Paginador, VistaRapida],
  templateUrl: './salida-lista.html',
})
export class SalidaLista {
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly mes = signal<number | null>(null);
  protected readonly estatus = signal<FiltroEstatus>('pendientes');
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly registros = signal<RegistroListado[]>([]);
  protected readonly busqueda = signal('');
  protected readonly prioridad = signal<ClasePrioridad | null>(null);
  protected readonly pagina = signal(1);
  protected readonly abierto = signal<RegistroListado | null>(null);

  protected readonly fechaHora = fechaHora;
  protected readonly plazo = plazo;
  protected readonly clasePrioridad = clasePrioridad;

  protected readonly filtrados = computed(() => {
    const q = normalizar(this.busqueda().trim());
    const prio = this.prioridad();
    return this.registros().filter(
      (r) =>
        (!prio || clasePrioridad(r.urgente) === prio) &&
        (!q ||
          normalizar(
            `${r.folio} ${r.referencia ?? ''} ${r.asunto} ${r.remitente} ${r.turnos.map((t) => t.nombre).join(' ')}`,
          ).includes(q)),
    );
  });

  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtrados().length / POR_PAGINA)));
  protected readonly visibles = computed(() =>
    this.filtrados().slice((this.pagina() - 1) * POR_PAGINA, this.pagina() * POR_PAGINA),
  );
  protected readonly desde = computed(() => (this.filtrados().length ? (this.pagina() - 1) * POR_PAGINA + 1 : 0));
  protected readonly hasta = computed(() => Math.min(this.pagina() * POR_PAGINA, this.filtrados().length));

  constructor(private readonly registrosService: RegistrosService) {
    // Al cambiar la búsqueda o la prioridad se vuelve a la primera página.
    effect(() => {
      this.busqueda();
      this.prioridad();
      this.pagina.set(1);
    });
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

  onEstatusChange(estatus: FiltroEstatus): void {
    this.estatus.set(estatus);
    this.cargar();
  }

  /** Turnos para atención ya atendidos sobre el total de turnos para atención. */
  avance(r: RegistroListado): { hechos: number; total: number } {
    const atencion = r.turnos.filter((t) => t.tipo === 'A');
    return { hechos: atencion.filter((t) => t.atendido).length, total: atencion.length };
  }

  destinatarios(r: RegistroListado): string {
    const nombres = r.turnos.map((t) => t.nombre);
    if (nombres.length === 0) return 'Sin destinatarios';
    if (nombres.length === 1) return nombres[0];
    return `${nombres[0]} y ${nombres.length - 1} más`;
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.pagina.set(1);
    this.registrosService.listar(this.anio(), this.mes(), this.estatus()).subscribe({
      next: (rows) => {
        this.registros.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar tus registros.');
        this.cargando.set(false);
      },
    });
  }
}
