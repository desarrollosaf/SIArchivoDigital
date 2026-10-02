export type TipoArchivo = 'imagen' | 'pdf' | 'excel' | 'word' | 'xml' | 'otro';

export const EXTENSION_TIPO_ARCHIVO: Record<string, TipoArchivo> = {
  jpg: 'imagen',
  jpeg: 'imagen',
  png: 'imagen',
  gif: 'imagen',
  webp: 'imagen',
  svg: 'imagen',
  pdf: 'pdf',
  xlsx: 'excel',
  xls: 'excel',
  csv: 'excel',
  doc: 'word',
  docx: 'word',
  xml: 'xml',
};

export const ETIQUETA_TIPO_ARCHIVO: Record<TipoArchivo, string> = {
  imagen: '',
  pdf: 'PDF',
  excel: 'XLS',
  word: 'DOC',
  xml: 'XML',
  otro: '',
};

export function tipoArchivoPorNombre(nombre: string): TipoArchivo {
  const ext = nombre.toLowerCase().split('.').pop() ?? '';
  return EXTENSION_TIPO_ARCHIVO[ext] ?? 'otro';
}
