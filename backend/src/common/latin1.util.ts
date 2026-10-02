/**
 * Las tablas heredadas de Presidencia (`registro_presidencia`, `agenda_presidencia`,
 * `comision_registro`) están en latin1 (cp1252 en MariaDB): no admiten emojis ni otros
 * caracteres fuera de ese juego y MySQL rechaza el INSERT completo.
 */

/** Caracteres de cp1252 fuera de U+0000–U+00FF (comillas tipográficas, guiones, €, …). */
const EXTRAS_CP1252 = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));

function cabeEnLatin1(caracter: string): boolean {
  return (caracter.codePointAt(0) ?? 0) <= 0xff || EXTRAS_CP1252.has(caracter);
}

/** Caracteres del texto que no se pueden guardar (sin repetir). */
export function caracteresNoLatin1(texto: string | null | undefined): string[] {
  return [...new Set([...(texto ?? '')].filter((c) => !cabeEnLatin1(c)))];
}

/** Copia del texto apta para latin1: lo que no cabe se sustituye por "?". */
export function aLatin1(texto: string | null | undefined): string | null {
  if (texto == null) return null;
  return [...texto].map((c) => (cabeEnLatin1(c) ? c : '?')).join('');
}
