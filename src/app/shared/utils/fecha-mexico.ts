/**
 * Fecha de "hoy" en la zona horaria de México Central (America/Mexico_City, UTC-6 fijo desde
 * que México eliminó el horario de verano en 2022), sin importar la zona horaria configurada en
 * el navegador del usuario. Se usa en vez de `new Date().toISOString()`, que toma la fecha en
 * UTC y puede adelantarse un día entre las 18:00 y 23:59 hora de México.
 */
export function fechaHoyMexico(): string {
  // en-CA formatea como YYYY-MM-DD, exactamente el formato que ya usa el resto del código.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
