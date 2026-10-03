/** Auxiliares de la vista de bandejas (tomados de los utils de SIIntranetD). */

export type ClasePrioridad = 'alta' | 'media' | 'baja';

export function iniciales(nombre: string | null | undefined): string {
  return (nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const PALETA_AVATAR = ['#7a1533', '#33506e', '#1f6e45', '#8a5a1a', '#5c3a7a', '#960048'];

export function colorAvatar(nombre: string | null | undefined): string {
  let h = 0;
  for (const ch of nombre ?? '') h = (h + ch.charCodeAt(0)) % PALETA_AVATAR.length;
  return PALETA_AVATAR[h];
}

/** Urgente se pinta como prioridad alta (rojo) y ordinario como media (naranja). */
export function clasePrioridad(urgente: boolean): ClasePrioridad {
  return urgente ? 'alta' : 'media';
}

const FORMATO = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Fecha y hora de México: "17/09/2026 · 14:35". */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const partes = Object.fromEntries(FORMATO.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${partes['day']}/${partes['month']}/${partes['year']} · ${partes['hour']}:${partes['minute']}`;
}

/** Texto y color del plazo de un pendiente. */
export function plazo(diasRestantes: number | null): { texto: string; clase: ClasePrioridad } | null {
  if (diasRestantes === null) return null;
  if (diasRestantes < 0) {
    const d = Math.abs(diasRestantes);
    return { texto: `Vencido hace ${d} ${d === 1 ? 'día' : 'días'}`, clase: 'alta' };
  }
  if (diasRestantes === 0) return { texto: 'Vence hoy', clase: 'alta' };
  return {
    texto: `Vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}`,
    clase: diasRestantes <= 2 ? 'alta' : 'baja',
  };
}

/** Minúsculas y sin acentos, para buscar sin importar cómo se escriba. */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export const POR_PAGINA = 20;
