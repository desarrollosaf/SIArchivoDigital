import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CatalogosService, Persona } from '../../core/services/catalogos.service';
import { RegistrosService } from '../../core/services/registros.service';

/**
 * De dónde salen las opciones: destinatarios (personas + grupos), servidores públicos, folios
 * propios, o "local" (solo la lista fija de `extras`, sin consultar al servidor).
 */
export type FuentePersonas = 'destinatarios' | 'servidores' | 'rastreables' | 'local';

const MIN_CARACTERES = 2;

/** Minúsculas y sin acentos, para que "publicas" encuentre "Públicas". */
function sinAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Selector con búsqueda remota. En modo múltiple muestra lo elegido como etiquetas; en modo
 * sencillo reemplaza la selección. `extras` agrega opciones fijas (p. ej. "Remitente externo").
 */
@Component({
  selector: 'app-persona-picker',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './persona-picker.html',
  styleUrl: './persona-picker.scss',
})
export class PersonaPicker {
  readonly fuente = input<FuentePersonas>('destinatarios');
  readonly seleccion = input<Persona[]>([]);
  readonly multiple = input(true);
  readonly placeholder = input('Escribe al menos 2 letras para buscar…');
  readonly invalid = input(false);
  readonly disabled = input(false);
  readonly extras = input<Persona[]>([]);

  readonly seleccionChange = output<Persona[]>();

  protected readonly query = signal('');
  protected readonly abierto = signal(false);
  protected readonly buscando = signal(false);
  protected readonly resultados = signal<Persona[]>([]);

  protected readonly opciones = computed(() => {
    const elegidos = new Set(this.seleccion().map((p) => p.id));
    const term = sinAcentos(this.query().trim());
    const extras = this.extras().filter((e) => !term || sinAcentos(e.nombre).includes(term));
    return [...extras, ...this.resultados()].filter((p) => !elegidos.has(p.id));
  });

  private readonly busqueda$ = new Subject<string>();

  constructor(
    private readonly catalogosService: CatalogosService,
    private readonly registrosService: RegistrosService,
  ) {
    this.busqueda$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (this.fuente() === 'local' || term.trim().length < MIN_CARACTERES) {
            return of([] as Persona[]);
          }
          this.buscando.set(true);
          return this.consultar(term).pipe(catchError(() => of([] as Persona[])));
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((rows) => {
        this.resultados.set(rows);
        this.buscando.set(false);
      });
  }

  onQueryChange(valor: string): void {
    this.query.set(valor);
    this.abierto.set(true);
    this.busqueda$.next(valor);
  }

  onBlur(): void {
    setTimeout(() => this.abierto.set(false), 150);
  }

  elegir(persona: Persona): void {
    this.seleccionChange.emit(this.multiple() ? [...this.seleccion(), persona] : [persona]);
    this.query.set('');
    this.resultados.set([]);
    this.abierto.set(false);
  }

  quitar(persona: Persona): void {
    this.seleccionChange.emit(this.seleccion().filter((p) => p.id !== persona.id));
  }

  private consultar(term: string): Observable<Persona[]> {
    switch (this.fuente()) {
      case 'servidores':
        return this.catalogosService.servidoresPublicos(term);
      case 'rastreables':
        return this.registrosService.rastreables(term);
      default:
        return this.catalogosService.destinatarios(term);
    }
  }
}
