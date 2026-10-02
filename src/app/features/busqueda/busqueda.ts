import { Component, ElementRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { RegistroListado, RegistrosService } from '../../core/services/registros.service';
import { AG_GRID_LOCALE, siadGridTheme } from '../../shared/ag-grid/ag-grid-setup';
import { habilitarArrastreHorizontal } from '../../shared/ag-grid/arrastre-horizontal';
import { CLASES_FILA_REGISTRO, columnasRegistro } from '../salida/columnas-registro';

const MIN_CARACTERES = 2;

@Component({
  selector: 'app-busqueda',
  standalone: true,
  imports: [FormsModule, AgGridAngular],
  templateUrl: './busqueda.html',
  styleUrl: './busqueda.scss',
})
export class Busqueda {
  protected readonly termino = signal('');
  protected readonly buscado = signal<string | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultados = signal<RegistroListado[]>([]);

  protected readonly gridTheme = siadGridTheme;
  protected readonly localeText = AG_GRID_LOCALE;
  protected readonly columnas = columnasRegistro();
  protected readonly clasesFila = CLASES_FILA_REGISTRO;

  constructor(
    private readonly registrosService: RegistrosService,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {}

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
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo realizar la búsqueda.');
        this.cargando.set(false);
      },
    });
  }

  onGridReady(): void {
    habilitarArrastreHorizontal(this.elementRef.nativeElement);
  }
}
