import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, extname, normalize, resolve, sep } from 'path';
import type { Response } from 'express';

export const MAX_ARCHIVO_BYTES = 20 * 1024 * 1024;

/** Laravel marcaba "sin archivo" con estos textos en vez de dejar la columna en NULL. */
const SIN_ARCHIVO = new Set(['', 'nofile', 'notfile']);

const EXTENSIONES_PERMITIDAS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
  '.txt',
  '.zip',
]);

export function tieneArchivo(ruta: string | null | undefined): ruta is string {
  return !!ruta && !SIN_ARCHIVO.has(ruta);
}

/**
 * Dónde vive un archivo, con la misma estructura que el storage de Laravel:
 * - "documentos": storage/app (registros/, comentarios/, Conclusion/…), lo que Laravel leía con
 *   Storage::get().
 * - "publico": storage/app/public (images/gabinete/, fotos/…), lo que Laravel mostraba con
 *   asset('storage/…').
 */
export type ZonaArchivos = 'documentos' | 'publico';

/**
 * Guarda y entrega los documentos del sistema. Las rutas en la base son relativas a la zona
 * (p. ej. "registros/abc.pdf"), igual que las dejaba Laravel, así que con montar el storage de
 * Laravel el histórico abre tal cual, y lo nuevo se guarda junto (Laravel también lo puede abrir).
 * Los archivos nunca se exponen como estáticos: se entregan por endpoints que antes validan que el
 * usuario tenga acceso.
 */
@Injectable()
export class ArchivosService {
  private readonly raices: Record<ZonaArchivos, string>;

  constructor(config: ConfigService) {
    this.raices = {
      documentos: resolve(config.get<string>('storage.uploadsDir')!),
      publico: resolve(config.get<string>('storage.publicDir')!),
    };
  }

  async guardar(
    archivo: Express.Multer.File,
    carpeta: string,
    zona: ZonaArchivos = 'documentos',
  ): Promise<string> {
    const extension = extname(archivo.originalname).toLowerCase();
    if (!EXTENSIONES_PERMITIDAS.has(extension)) {
      throw new BadRequestException(
        `El tipo de archivo ${extension || '(sin extensión)'} no está permitido`,
      );
    }
    const relativa = `${carpeta}/${randomUUID()}${extension}`;
    const destino = this.rutaAbsoluta(relativa, zona);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, archivo.buffer);
    return relativa;
  }

  /**
   * Guarda (o reemplaza) el archivo en una ruta fija, p. ej. la foto de perfil "fotos/RFC.png"
   * que también leen los otros sistemas que comparten users_safs.
   */
  async guardarEn(
    archivo: Express.Multer.File,
    relativa: string,
    extensiones: string[],
    zona: ZonaArchivos = 'documentos',
  ): Promise<string> {
    const extension = extname(archivo.originalname).toLowerCase();
    if (!extensiones.includes(extension)) {
      throw new BadRequestException(
        `Solo se permiten archivos ${extensiones.join(', ')}`,
      );
    }
    const destino = this.rutaAbsoluta(relativa, zona);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, archivo.buffer);
    return relativa;
  }

  enviar(
    res: Response,
    relativa: string | null | undefined,
    nombreDescarga?: string,
    zona: ZonaArchivos = 'documentos',
  ): void {
    if (!tieneArchivo(relativa)) {
      throw new NotFoundException('El registro no tiene archivo adjunto');
    }
    // Las fotos se buscan primero en storage/app/public (Laravel) y luego en la raíz, por si se
    // copiaron ahí en lugar de montar el storage completo.
    const candidatas =
      zona === 'publico'
        ? [
            this.rutaAbsoluta(relativa, 'publico'),
            this.rutaAbsoluta(relativa, 'documentos'),
          ]
        : [this.rutaAbsoluta(relativa, 'documentos')];
    const absoluta = candidatas.find((c) => existsSync(c));
    if (!absoluta) {
      throw new NotFoundException('No se encontró el archivo en el servidor');
    }
    const nombre = nombreDescarga ?? absoluta.split(sep).pop()!;
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(nombre)}"`,
    );
    res.sendFile(absoluta);
  }

  /** Resuelve la ruta dentro de la zona; rechaza cualquier intento de salirse. */
  private rutaAbsoluta(relativa: string, zona: ZonaArchivos): string {
    const raiz = this.raices[zona];
    const absoluta = resolve(raiz, normalize(relativa));
    if (absoluta !== raiz && !absoluta.startsWith(raiz + sep)) {
      throw new BadRequestException('Ruta de archivo inválida');
    }
    return absoluta;
  }
}
