import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DiputadoListado,
  FichaDiputado,
  PresidenciaService,
} from '../../core/services/presidencia.service';
import { ToastService } from '../../core/services/toast.service';
import { MESES } from '../../core/services/cumpleanos.service';

function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Ficha de las y los diputados con datos del portal del Legislativo (Laravel: Diputados,
 * IntegrantesController@getInfo).
 */
@Component({
  selector: 'app-diputados',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './diputados.html',
  styleUrl: './diputados.scss',
})
export class Diputados {
  protected readonly lista = signal<DiputadoListado[]>([]);
  protected readonly cargando = signal(true);
  protected readonly busqueda = signal('');
  protected readonly seleccionado = signal<string | null>(null);
  protected readonly ficha = signal<FichaDiputado | null>(null);
  protected readonly cargandoFicha = signal(false);
  protected readonly fotoRota = signal(false);

  protected readonly visibles = computed(() => {
    const term = sinAcentos(this.busqueda().trim());
    if (!term) return this.lista();
    return this.lista().filter((d) =>
      sinAcentos(`${d.nombre} ${d.partido ?? ''} ${d.distrito ?? ''}`).includes(term),
    );
  });

  constructor(
    private readonly presidenciaService: PresidenciaService,
    private readonly toastService: ToastService,
  ) {
    this.presidenciaService.diputados().subscribe({
      next: (rows) => {
        this.lista.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('No se pudo cargar la lista de diputados.');
      },
    });
  }

  ver(d: DiputadoListado): void {
    this.seleccionado.set(d.id);
    this.cargandoFicha.set(true);
    this.fotoRota.set(false);
    this.presidenciaService.diputado(d.id).subscribe({
      next: (f) => {
        this.ficha.set(f);
        this.cargandoFicha.set(false);
      },
      error: () => {
        this.cargandoFicha.set(false);
        this.toastService.error('No se pudo cargar la ficha.');
      },
    });
  }

  /** "1985-04-12" -> { cumple: "12 de abril", completa: "12 de abril de 1985" }. */
  nacimiento(fecha: string): { cumple: string; completa: string } {
    const [a, m, d] = fecha.split('-').map(Number);
    const cumple = `${d} de ${MESES[m - 1]}`;
    return { cumple, completa: `${cumple} de ${a}` };
  }

  iniciales(nombre: string): string {
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }
}
