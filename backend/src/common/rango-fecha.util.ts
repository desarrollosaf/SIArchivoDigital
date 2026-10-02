/**
 * Calcula el rango de fechas (inclusivo, formato YYYY-MM-DD) para filtrar listados por año
 * y, opcionalmente, mes. Se usa para no cargar el histórico completo de solicitudes en listas
 * que van a crecer indefinidamente.
 */
export function rangoFecha(
  anio: number,
  mes?: number,
): { desde: string; hasta: string } {
  if (mes) {
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    return { desde, hasta };
  }
  return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
}
