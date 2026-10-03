import { Component, ElementRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ConsultasService, DocumentoConcentracion } from '../../core/services/consultas.service';
import { AG_GRID_LOCALE, siadGridTheme } from '../../shared/ag-grid/ag-grid-setup';
import { LinkCeldaComponent } from '../../shared/ag-grid/link-celda';
import { habilitarArrastreHorizontal } from '../../shared/ag-grid/arrastre-horizontal';
import { etiquetaEstatus, fechaCorta } from '../../shared/estatus/estatus';

@Component({
  selector: 'app-concentracion',
  standalone: true,
  imports: [FormsModule, AgGridAngular],
  templateUrl: './concentracion.html',
  styleUrl: './concentracion.scss',
})
export class Concentracion {
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly documentos = signal<DocumentoConcentracion[]>([]);
  protected readonly busqueda = signal('');

  protected readonly gridTheme = siadGridTheme;
  protected readonly localeText = AG_GRID_LOCALE;

  protected readonly columnas: ColDef<DocumentoConcentracion>[] = [
    { field: 'folio', headerName: 'Folio', minWidth: 140, flex: 0.8 },
    {
      field: 'serie',
      headerName: 'Serie',
      minWidth: 160,
      flex: 1,
      wrapText: true,
      autoHeight: true,
      cellClass: 'celda-larga',
    },
    {
      field: 'asunto',
      headerName: 'Asunto',
      minWidth: 300,
      flex: 2.4,
      wrapText: true,
      autoHeight: true,
      cellClass: 'celda-larga',
    },
    {
      field: 'remitente',
      headerName: 'Remitente',
      minWidth: 180,
      flex: 1.1,
      wrapText: true,
      autoHeight: true,
      cellClass: 'celda-larga',
    },
    {
      field: 'fechaRecepcion',
      headerName: 'Recepción',
      width: 125,
      valueFormatter: (p) => fechaCorta(p.value),
    },
    {
      field: 'diasTranscurridos',
      headerName: 'Antigüedad',
      width: 130,
      valueFormatter: (p) => `${Math.floor(Number(p.value) / 365)} a ${Number(p.value) % 365} d`,
    },
    {
      field: 'estatus',
      headerName: 'Estatus',
      width: 150,
      cellRenderer: (p: ICellRendererParams<DocumentoConcentracion>) =>
        p.data ? etiquetaEstatus(p.data.estatus) : '',
    },
    {
      headerName: '',
      width: 120,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: LinkCeldaComponent,
      cellRendererParams: {
        label: 'Abrir',
        icono: 'ojo',
        routerLink: (p: ICellRendererParams<DocumentoConcentracion>) => ['/documentos', p.data!.id],
      },
    },
  ];

  constructor(
    consultasService: ConsultasService,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {
    consultasService.concentracion().subscribe({
      next: (rows) => {
        this.documentos.set(rows);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el archivo de concentración.');
        this.cargando.set(false);
      },
    });
  }

  onGridReady(): void {
    habilitarArrastreHorizontal(this.elementRef.nativeElement);
  }
}
