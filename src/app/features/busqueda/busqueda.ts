import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegistroListado, RegistrosService } from '../../core/services/registros.service';
import {
  ClasePrioridad,
  clasePrioridad,
  fechaHora,
  plazo,
  POR_PAGINA,
} from '../../shared/bandeja/bandeja-util';
import { VistaRapida } from '../../shared/bandeja/vista-rapida';
import { Icono } from '../../shared/icono/icono';
import { Paginador } from '../../shared/paginador/paginador';

const MIN_CARACTERES = 2;

/** Búsqueda de folios con las mismas tarjetas que la Bandeja (entrada y salida). */
@Component({
  selector: 'app-busqueda',
  standalone: true,
  imports: [FormsModule, Icono, Paginador, VistaRapida],
  templateUrl: './busqueda.html',
  styleUrl: './busqueda.scss',
})
export class Busqueda {
  protected readonly termino = signal('');
  protected readonly buscado = signal<string | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultados = signal<RegistroListado[]>([]);
  protected readonly prioridad = signal<ClasePrioridad | null>(null);
  protected readonly pagina = signal(1);
  protected readonly abierto = signal<RegistroListado | null>(null);

  protected readonly fechaHora = fechaHora;
  protected readonly plazo = plazo;
  protected readonly clasePrioridad = clasePrioridad;

  protected readonly filtrados = computed(() => {
    const prio = this.prioridad();
    return this.resultados().filter((r) => !prio || clasePrioridad(r.urgente) === prio);
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

  constructor(private readonly registrosService: RegistrosService) {
    effect(() => {
      this.prioridad();
      this.pagina.set(1);
    });
  }

  buscar(): void {
    const q = this.termino().trim();
    if (q.length < MIN_CARACTERES) {
      this.error.set(`Escribe al menos ${MIN_CARACTERES} caracteres.`);
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.registrosService.buscar(q).subscribe({
      next: (rows) => {
        this.resultados.set(rows);
        this.buscado.set(q);
        this.pagina.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo realizar la búsqueda.');
        this.cargando.set(false);
      },
    });
  }

  limpiar(): void {
    this.termino.set('');
    this.buscado.set(null);
    this.resultados.set([]);
    this.error.set(null);
  }

  alternarPrioridad(p: ClasePrioridad): void {
    this.prioridad.update((actual) => (actual === p ? null : p));
  }

  destinatarios(r: RegistroListado): string {
    const nombres = r.turnos.map((t) => t.nombre);
    if (nombres.length === 0) return 'Sin destinatarios';
    if (nombres.length === 1) return nombres[0];
    return `${nombres[0]} y ${nombres.length - 1} más`;
  }
}
