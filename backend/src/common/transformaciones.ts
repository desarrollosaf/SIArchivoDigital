import { Transform } from 'class-transformer';

/**
 * Los formularios multipart mandan todo como texto y los campos vacíos como "". Estos
 * decoradores normalizan antes de validar, para poder usar @IsOptional con campos vacíos.
 */
export const ATexto = () =>
  Transform(({ value }: { value: unknown }) => {
    if (
      value === '' ||
      value === null ||
      value === undefined ||
      value === 'null'
    )
      return undefined;
    if (typeof value === 'string') return value.trim();
    return typeof value === 'number' ? String(value) : value;
  });

export const ANumero = () =>
  Transform(({ value }: { value: unknown }) => {
    if (
      value === '' ||
      value === null ||
      value === undefined ||
      value === 'null'
    )
      return undefined;
    return Number(value);
  });

/** FormData repite la clave por cada elemento: con uno solo llega como texto, no como arreglo. */
export const AArreglo = () =>
  Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return [];
    return (Array.isArray(value) ? value : [value]).map(String).filter(Boolean);
  });
