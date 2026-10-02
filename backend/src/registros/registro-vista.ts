import { Registro } from '../database/models/registro.model';
import { diasHastaFecha } from '../common/fecha-mexico.util';

export const REMITENTE_EXTERNO = '999';

export type EstatusRegistro = 'Pendiente' | 'Concluido' | 'Cancelado';

export function estatusRegistro(
  r: Pick<Registro, 'activo' | 'status'>,
): EstatusRegistro {
  if (!r.activo) return 'Cancelado';
  return r.status ? 'Pendiente' : 'Concluido';
}

/** Días que faltan para la fecha límite; null si el registro ya no está pendiente. */
export function diasRestantes(
  r: Pick<Registro, 'activo' | 'status' | 'fechaLimiteAtencion'>,
): number | null {
  if (!r.activo || !r.status || !r.fechaLimiteAtencion) return null;
  return diasHastaFecha(r.fechaLimiteAtencion);
}

export function nombreRemitente(
  r: Pick<Registro, 'remitenteRfc' | 'otroRemitente'>,
  nombres: Map<string, string>,
): string {
  if (r.remitenteRfc === REMITENTE_EXTERNO) return r.otroRemitente ?? 'Externo';
  return nombres.get(r.remitenteRfc) ?? r.otroRemitente ?? r.remitenteRfc;
}

export function horaCorta(valor: string | null | undefined): string | null {
  return valor ? valor.slice(0, 5) : null;
}
