import { ColDef, ICellRendererParams, RowClassRules } from 'ag-grid-community';
import { RegistroListado } from '../../core/services/registros.service';
import { LinkCeldaComponent } from '../../shared/ag-grid/link-celda';
import {
  celdaFolio,
  escaparHtml,
  etiquetaEstatus,
  etiquetaPrioridad,
  fechaCorta,
} from '../../shared/estatus/estatus';

/** Resumen de destinatarios: "Nombre (+2)" y cuántos turnos de atención siguen pendientes. */
function resumenTurnos(r: RegistroListado): string {
  if (r.turnos.length === 0) return '<span class="aviso">Sin turnos</span>';
  const [primero, ...resto] = r.turnos;
  const pendientes = r.turnos.filter((t) => t.tipo === 'A' && !t.atendido).length;
  const extra = resto.length
    ? ` <span class="etiqueta etiqueta--gris">+${resto.length}</span>`
    : '';
  const estado =
    r.estatus === 'Pendiente' && pendientes ? `<br><small>${pendientes} por atender</small>` : '';
  return `${escaparHtml(primero.nombre)}${extra}${estado}`;
}

/** Los registros cancelados se pintan en rosa, como en la bandeja de salida de Laravel. */
export const CLASES_FILA_REGISTRO: RowClassRules<RegistroListado> = {
  'fila-cancelada': (p) => p.data?.estatus === 'Cancelado',
};

/** Columnas de un listado de registros (bandeja de salida y búsqueda). */
export function columnasRegistro(): ColDef<RegistroListado>[] {
  return [
    {
      field: 'folio',
      headerName: 'Folio',
      width: 175,
      autoHeight: true,
      cellClass: 'celda-larga',
      cellRenderer: (p: ICellRendererParams<RegistroListado>) =>
        p.data
          ? celdaFolio(p.data.folio, `Recibido ${fechaCorta(p.data.fechaRecepcion)}`, [
              p.data.urgente ? etiquetaPrioridad(true) : '',
            ])
          : '',
    },
    {
      field: 'referencia',
      headerName: 'Referencia',
      minWidth: 120,
      flex: 0.8,
      wrapText: true,
      autoHeight: true,
      cellClass: 'celda-larga',
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
      // Como la bandeja de salida de Laravel: lo que captura Recepción de Presidencia.
      cellRenderer: (p: ICellRendererParams<RegistroListado>) =>
        p.data
          ? escaparHtml(p.data.remitente) +
            (p.data.dirigidoA
              ? `<br><small class="dirigido">Dirigido a: ${escaparHtml(p.data.dirigidoA)}</small>`
              : '')
          : '',
    },
    {
      colId: 'turnos',
      headerName: 'Turnado a',
      minWidth: 160,
      flex: 1,
      autoHeight: true,
      cellClass: 'celda-larga',
      valueGetter: (p) => p.data?.turnos.map((t) => t.nombre).join(' ') ?? '',
      cellRenderer: (p: ICellRendererParams<RegistroListado>) =>
        p.data ? resumenTurnos(p.data) : '',
    },
    {
      field: 'fechaLimite',
      headerName: 'Límite',
      width: 112,
      valueFormatter: (p) => fechaCorta(p.value),
    },
    {
      field: 'estatus',
      headerName: 'Estatus',
      width: 150,
      cellRenderer: (p: ICellRendererParams<RegistroListado>) =>
        p.data ? etiquetaEstatus(p.data.estatus, p.data.diasRestantes) : '',
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
        routerLink: (p: ICellRendererParams<RegistroListado>) => ['/documentos', p.data!.id],
      },
    },
  ];
}
