import { EstatusRegistro } from '../../core/services/registros.service';

/**
 * Etiquetas de estatus como HTML para las celdas de ag-grid (que no pasan por el compilador de
 * Angular). Las clases `.etiqueta--*` están en styles.scss.
 */
export function etiquetaEstatus(
  estatus: EstatusRegistro,
  diasRestantes: number | null = null,
): string {
  if (estatus === 'Cancelado') return '<span class="etiqueta etiqueta--gris">Cancelado</span>';
  if (estatus === 'Concluido') return '<span class="etiqueta etiqueta--verde">Concluido</span>';
  return etiquetaPlazo(diasRestantes);
}

/** Pendiente: rojo si venció o vence en 2 días o menos, ámbar si no. */
export function etiquetaPlazo(diasRestantes: number | null): string {
  if (diasRestantes === null) return '<span class="etiqueta etiqueta--ambar">Pendiente</span>';
  if (diasRestantes < 0) {
    const dias = Math.abs(diasRestantes);
    return `<span class="etiqueta etiqueta--roja">Vencido hace ${dias} ${dias === 1 ? 'día' : 'días'}</span>`;
  }
  if (diasRestantes === 0) return '<span class="etiqueta etiqueta--roja">Vence hoy</span>';
  const clase = diasRestantes <= 2 ? 'roja' : 'ambar';
  return `<span class="etiqueta etiqueta--${clase}">${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}</span>`;
}

export function etiquetaTipoTurno(tipo: 'A' | 'C'): string {
  return tipo === 'A'
    ? '<span class="etiqueta etiqueta--vino">Atención</span>'
    : '<span class="etiqueta etiqueta--azul">Conocimiento</span>';
}

export function etiquetaPrioridad(urgente: boolean): string {
  return urgente
    ? '<span class="etiqueta etiqueta--roja">Urgente</span>'
    : '<span class="etiqueta etiqueta--gris">Ordinario</span>';
}

/**
 * Celda de folio: el folio en negritas y debajo, en chico, datos secundarios (fecha y etiquetas)
 * para no gastar columnas en ellos.
 */
export function celdaFolio(folio: string, detalle: string, etiquetas: string[] = []): string {
  const extra = etiquetas.filter(Boolean).join(' ');
  return (
    `<strong>${escaparHtml(folio)}</strong>` +
    `<br><small class="celda-folio__detalle">${escaparHtml(detalle)}</small>` +
    (extra ? `<br>${extra}` : '')
  );
}

/** "2026-10-02" -> "02/10/2026". */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '';
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Escapa texto que se va a meter en HTML de una celda. */
export function escaparHtml(texto: string | null | undefined): string {
  return (texto ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
