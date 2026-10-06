import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'path';
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
 * Guarda y entrega los documentos del sistema. Las rutas en la base son relativas a la carpeta de
 * documentos (p. ej. "registros/abc.pdf"), igual que las dejaba Laravel en storage/app, así que
 * basta copiar esa carpeta para que el histórico siga abriendo. Los archivos nunca se exponen como
 * estáticos: se entregan por endpoints que antes validan que el usuario tenga acceso.
 */
@Injectable()
export class ArchivosService {
  private readonly raiz: string;

  constructor(config: ConfigService) {
    this.raiz = resolve(config.get<string>('storage.uploadsDir')!);
  }

  async guardar(
    archivo: Express.Multer.File,
    carpeta: string,
  ): Promise<string> {
    const extension = extname(archivo.originalname).toLowerCase();
    if (!EXTENSIONES_PERMITIDAS.has(extension)) {
      throw new BadRequestException(
        `El tipo de archivo ${extension || '(sin extensión)'} no está permitido`,
      );
    }
    const relativa = `${carpeta}/${randomUUID()}${extension}`;
    const destino = this.rutaAbsoluta(relativa);
    await mkdir(join(this.raiz, carpeta), { recursive: true });
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
  ): Promise<string> {
    const extension = extname(archivo.originalname).toLowerCase();
    if (!extensiones.includes(extension)) {
      throw new BadRequestException(
        `Solo se permiten archivos ${extensiones.join(', ')}`,
      );
    }
    const destino = this.rutaAbsoluta(relativa);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, archivo.buffer);
    return relativa;
  }

  enviar(
    res: Response,
    relativa: string | null | undefined,
    nombreDescarga?: string,
  ): void {
    if (!tieneArchivo(relativa)) {
      throw new NotFoundException('El registro no tiene archivo adjunto');
    }
    const absoluta = this.rutaAbsoluta(relativa);
    if (!existsSync(absoluta)) {
      throw new NotFoundException('No se encontró el archivo en el servidor');
    }
    const nombre = nombreDescarga ?? absoluta.split(sep).pop()!;
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(nombre)}"`,
    );
    res.sendFile(absoluta);
  }

  /** Resuelve la ruta dentro de la carpeta de documentos; rechaza cualquier intento de salirse. */
  private rutaAbsoluta(relativa: string): string {
    const absoluta = resolve(this.raiz, normalize(relativa));
    if (absoluta !== this.raiz && !absoluta.startsWith(this.raiz + sep)) {
      throw new BadRequestException('Ruta de archivo inválida');
    }
    return absoluta;
  }
}
