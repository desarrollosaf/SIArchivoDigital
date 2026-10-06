import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'path';
import { InjectModel } from '@nestjs/sequelize';
import type { Response } from 'express';
import { PumpesGabinete } from '../database/models/pumpes-gabinete.model';
import { ArchivosService, tieneArchivo } from '../common/archivos.service';

export interface GabineteDatos {
  nombre: string;
  cargo?: string;
  profesion?: string;
  otros?: string;
  fechaNacimiento?: string;
  /** 0 = Gobierno del Estado de México, 1 = Congreso del Estado de México. */
  tipo: number;
}

const CARPETA_FOTOS = 'images/gabinete';
const EXTENSIONES_FOTO = ['.jpg', '.jpeg', '.png', '.webp'];

/** Catálogo del gabinete (Laravel: PumpesGabineteController e IntegrantesController@getgabinete). */
@Injectable()
export class GabineteService {
  constructor(
    @InjectModel(PumpesGabinete)
    private readonly gabineteModel: typeof PumpesGabinete,
    private readonly archivos: ArchivosService,
  ) {}

  async listar() {
    const filas = await this.gabineteModel.findAll({
      order: [['nombre', 'ASC']],
    });
    return filas.map((g) => this.aVista(g));
  }

  async crear(datos: GabineteDatos, foto?: Express.Multer.File) {
    const path = foto ? await this.guardarFoto(foto) : null;
    const g = await this.gabineteModel.create({ ...this.campos(datos), path });
    return this.aVista(g);
  }

  async actualizar(
    id: number,
    datos: GabineteDatos,
    foto?: Express.Multer.File,
  ) {
    const g = await this.buscar(id);
    const cambios: Record<string, unknown> = this.campos(datos);
    if (foto) cambios.path = await this.guardarFoto(foto);
    await g.update(cambios);
    return this.aVista(g);
  }

  /** Baja lógica (deleted_at), como en Laravel. */
  async eliminar(id: number) {
    const g = await this.buscar(id);
    await g.destroy();
    return { ok: true };
  }

  async enviarFoto(id: number, res: Response) {
    const g = await this.buscar(id);
    this.archivos.enviar(res, g.path, undefined, 'publico');
  }

  private guardarFoto(foto: Express.Multer.File) {
    if (!EXTENSIONES_FOTO.includes(extname(foto.originalname).toLowerCase())) {
      throw new BadRequestException('La foto debe ser JPG, PNG o WEBP.');
    }
    return this.archivos.guardar(foto, CARPETA_FOTOS, 'publico');
  }

  private async buscar(id: number) {
    const g = await this.gabineteModel.findByPk(id);
    if (!g) throw new NotFoundException('No se encontró a la persona.');
    return g;
  }

  private campos(datos: GabineteDatos) {
    return {
      nombre: datos.nombre,
      cargo: datos.cargo ?? null,
      profesion: datos.profesion ?? null,
      otros: datos.otros ?? null,
      fechaNacimiento: datos.fechaNacimiento ?? null,
      tipo: datos.tipo === 1,
    };
  }

  private aVista(g: PumpesGabinete) {
    return {
      id: Number(g.id),
      nombre: g.nombre ?? '',
      cargo: g.cargo,
      profesion: g.profesion,
      otros: g.otros,
      fechaNacimiento: g.fechaNacimiento,
      tipo: g.tipo ? 1 : 0,
      tieneFoto: tieneArchivo(g.path),
    };
  }
}
