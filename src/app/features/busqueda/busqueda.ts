import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Persona } from '../../core/services/catalogos.service';
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
import { PersonaPicker } from '../../shared/persona-picker/persona-picker';

const MIN_CARACTERES = 2;

/** Lo que se buscó: se reutiliza al cambiar de página o de prioridad. */
interface Criterios {
  q: string;
  remitente: Persona | null;
}

/**
 * Búsqueda de folios con las mismas tarjetas que la Bandeja (entrada y salida). La paginación y el
 * filtro de prioridad se resuelven en el servidor: cada página trae solo sus registros, así que se
 * pueden recorrer todos los resultados aunque sean miles.
 */
@Component({
  selector: 'app-busqueda',
  standalone: true,
  imports: [FormsModule, RouterLink, Icono, Paginador, VistaRapida, PersonaPicker],
  templateUrl: './busqueda.html',
  styleUrl: './busqueda.scss',
})
export class Busqueda {
  protected readonly termino = signal('');
  protected readonly remitente = signal<Persona[]>([]);
  protected readonly buscado = signal<Criterios | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultados = signal<RegistroListado[]>([]);
  protected readonly total = signal(0);
  protected readonly prioridad = signal<ClasePrioridad | null>(null);
  protected readonly pagina = signal(1);
  protected readonly abierto = signal<RegistroListado | null>(null);

  protected readonly fechaHora = fechaHora;
  protected readonly plazo = plazo;
  protected readonly clasePrioridad = clasePrioridad;

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.total() / POR_PAGINA)),
  );
  protected readonly desde = computed(() =>
    this.total() ? (this.pagina() - 1) * POR_PAGINA + 1 : 0,
  );
  protected readonly hasta = computed(() => Math.min(this.pagina() * POR_PAGINA, this.total()));
  /** Texto para "Sin resultados": qué se buscó. */
  protected readonly descripcionBusqueda = computed(() => {
    const c = this.buscado();
    if (!c) return '';
    const partes: string[] = [];
    if (c.q) partes.push(`“${c.q}”`);
    if (c.remitente) partes.push(`enviados por ${c.remitente.nombre}`);
    return partes.join(' ');
  });

  private peticion?: Subscription;

  constructor(private readonly registrosService: RegistrosService) {
    inject(DestroyRef).onDestroy(() => this.peticion?.unsubscribe());
  }

  buscar(): void {
    const q = this.termino().trim();
    const remitente = this.remitente()[0] ?? null;
    if (!remitente && q.length < MIN_CARACTERES) {
      this.error.set(`Escribe al menos ${MIN_CARACTERES} caracteres o elige un remitente.`);
      return;
    }
    this.buscado.set({ q: q.length >= MIN_CARACTERES ? q : '', remitente });
    this.pagina.set(1);
    this.cargar();
  }

  limpiar(): void {
    this.peticion?.unsubscribe();
    this.termino.set('');
    this.remitente.set([]);
    this.buscado.set(null);
    this.resultados.set([]);
    this.total.set(0);
    this.prioridad.set(null);
    this.pagina.set(1);
    this.error.set(null);
    this.cargando.set(false);
  }

  elegirRemitente(seleccion: Persona[]): void {
    this.remitente.set(seleccion);
    // Elegir un remitente busca de inmediato; quitarlo repite la búsqueda solo con el texto.
    if (seleccion.length) this.buscar();
    else if (this.buscado() === null) return;
    else if (this.termino().trim().length >= MIN_CARACTERES) this.buscar();
    else this.limpiar();
  }

  alternarPrioridad(p: ClasePrioridad): void {
    this.prioridad.update((actual) => (actual === p ? null : p));
    if (this.buscado() === null) return;
    this.pagina.set(1);
    this.cargar();
  }

  cambiarPagina(p: number): void {
    this.pagina.set(p);
    this.cargar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  destinatarios(r: RegistroListado): string {
    const nombres = r.turnos.map((t) => t.nombre);
    if (nombres.length === 0) return 'Sin destinatarios';
    if (nombres.length === 1) return nombres[0];
    return `${nombres[0]} y ${nombres.length - 1} más`;
  }

  private cargar(): void {
    const criterios = this.buscado();
    if (!criterios) return;
    const prio = this.prioridad();
    this.peticion?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);
    this.peticion = this.registrosService
      .buscar({
        q: criterios.q || undefined,
        remitente: criterios.remitente?.id,
        urgente: prio ? prio === 'alta' : undefined,
        pagina: this.pagina(),
        porPagina: POR_PAGINA,
      })
      .subscribe({
        next: (res) => {
          this.resultados.set(res.filas);
          this.total.set(res.total);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudo realizar la búsqueda.');
          this.cargando.set(false);
        },
      });
  }
}
