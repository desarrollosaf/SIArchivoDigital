import { Component, ElementRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ICellRendererParams, RowClassRules } from 'ag-grid-community';
import { FiltroTurnos, TurnoBandeja, TurnosService } from '../../core/services/turnos.service';
import { AG_GRID_LOCALE, siadGridTheme } from '../../shared/ag-grid/ag-grid-setup';
import { LinkCeldaComponent } from '../../shared/ag-grid/link-celda';
import { habilitarArrastreHorizontal } from '../../shared/ag-grid/arrastre-horizontal';
import { FiltroAnioMes } from '../../shared/filtro-anio-mes/filtro-anio-mes';
import {
  celdaFolio,
  etiquetaPlazo,
  etiquetaPrioridad,
  etiquetaTipoTurno,
  fechaCorta,
} from '../../shared/estatus/estatus';

const CLASES_FILA_TURNO: RowClassRules<TurnoBandeja> = {
  'fila-cancelada': (p) => !!p.data?.cancelado,
};

@Component({
  selector: 'app-bandeja-entrada',
  standalone: true,
  imports: [FormsModule, AgGridAngular, FiltroAnioMes],
  templateUrl: './entrada.html',
  styleUrl: './entrada.scss',
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

  protected readonly gridTheme = siadGridTheme;
  protected readonly localeText = AG_GRID_LOCALE;
  protected readonly clasesFila = CLASES_FILA_TURNO;

  protected readonly columnas: ColDef<TurnoBandeja>[] = [
    {
      field: 'folio',
      headerName: 'Folio',
      width: 175,
      autoHeight: true,
      cellClass: 'celda-larga',
      cellRenderer: (p: ICellRendererParams<TurnoBandeja>) =>
        p.data
          ? celdaFolio(p.data.folio, `Recibido ${fechaCorta(p.data.recibido)}`, [
              p.data.nuevo ? '<span class="etiqueta etiqueta--vino">Nuevo</span>' : '',
              p.data.urgente ? etiquetaPrioridad(true) : '',
            ])
          : '',
    },
    {
      field: 'asunto',
      headerName: 'Asunto',
      minWidth: 240,
      flex: 2.4,
      wrapText: true,
      autoHeight: true,
      cellClass: 'celda-larga',
    },
    {
      field: 'remitente',
      headerName: 'Remitente',
      minWidth: 150,
      flex: 1,
      wrapText: true,
      autoHeight: true,
      cellClass: 'celda-larga',
    },
    {
      field: 'turnadoPor',
      headerName: 'Turnado por',
      minWidth: 140,
      flex: 1,
      wrapText: true,
      autoHeight: true,
      cellClass: 'celda-larga',
    },
    {
      field: 'tipo',
      headerName: 'Para',
      width: 130,
      cellRenderer: (p: ICellRendererParams<TurnoBandeja>) =>
        p.data ? etiquetaTipoTurno(p.data.tipo) : '',
    },
    {
      field: 'fechaLimite',
      headerName: 'Límite',
      width: 112,
      valueFormatter: (p) => fechaCorta(p.value),
    },
    {
      colId: 'plazo',
      headerName: 'Plazo',
      width: 150,
      valueGetter: (p) => p.data?.diasRestantes ?? null,
      cellRenderer: (p: ICellRendererParams<TurnoBandeja>) =>
        p.data?.cancelado
          ? '<span class="etiqueta etiqueta--gris">Cancelado</span>'
          : p.data && this.filtro() === 'pendientes'
            ? etiquetaPlazo(p.data.diasRestantes)
            : '<span class="etiqueta etiqueta--verde">Atendido</span>',
    },
    {
      headerName: '',
      width: 110,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: LinkCeldaComponent,
      cellRendererParams: {
        label: 'Abrir',
        icono: 'ojo',
        routerLink: (p: ICellRendererParams<TurnoBandeja>) => ['/documentos', p.data!.registroId],
      },
    },
  ];

  constructor(
    private readonly turnosService: TurnosService,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {
    this.cargar();
  }

  cambiarFiltro(filtro: FiltroTurnos): void {
    if (this.filtro() === filtro) return;
    this.filtro.set(filtro);
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

  onGridReady(): void {
    habilitarArrastreHorizontal(this.elementRef.nativeElement);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
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
