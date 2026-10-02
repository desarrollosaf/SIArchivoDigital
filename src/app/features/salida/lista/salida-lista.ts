import { Component, ElementRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  FiltroEstatus,
  RegistroListado,
  RegistrosService,
} from '../../../core/services/registros.service';
import { AG_GRID_LOCALE, siadGridTheme } from '../../../shared/ag-grid/ag-grid-setup';
import { habilitarArrastreHorizontal } from '../../../shared/ag-grid/arrastre-horizontal';
import { FiltroAnioMes } from '../../../shared/filtro-anio-mes/filtro-anio-mes';
import { CLASES_FILA_REGISTRO, columnasRegistro } from '../columnas-registro';

@Component({
  selector: 'app-salida-lista',
  standalone: true,
  imports: [FormsModule, RouterLink, AgGridAngular, FiltroAnioMes],
  templateUrl: './salida-lista.html',
  styleUrl: './salida-lista.scss',
})
export class SalidaLista {
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly mes = signal<number | null>(null);
  protected readonly estatus = signal<FiltroEstatus>('pendientes');
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly registros = signal<RegistroListado[]>([]);
  protected readonly busqueda = signal('');

  protected readonly gridTheme = siadGridTheme;
  protected readonly localeText = AG_GRID_LOCALE;
  protected readonly columnas = columnasRegistro();
  protected readonly clasesFila = CLASES_FILA_REGISTRO;

  constructor(
    private readonly registrosService: RegistrosService,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {
    this.cargar();
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

  onGridReady(): void {
    habilitarArrastreHorizontal(this.elementRef.nativeElement);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
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
