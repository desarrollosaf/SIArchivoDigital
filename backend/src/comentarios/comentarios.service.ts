import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Response } from 'express';
import { Comentario } from '../database/models/comentario.model';
import { Respuesta } from '../database/models/respuesta.model';
import { ArchivosService } from '../common/archivos.service';
import { AccesoService } from '../common/acceso.service';
import { UsuarioActual } from '../common/usuario-actual';

const CARPETA_COMENTARIOS = 'comentarios';
const SIN_ARCHIVO = 'notfile';

@Injectable()
export class ComentariosService {
  constructor(
    @InjectModel(Comentario)
    private readonly comentarioModel: typeof Comentario,
    @InjectModel(Respuesta) private readonly respuestaModel: typeof Respuesta,
    private readonly archivos: ArchivosService,
    private readonly acceso: AccesoService,
  ) {}

  async comentar(
    registroId: number,
    texto: string | undefined,
    para: string | undefined,
    archivo: Express.Multer.File | undefined,
    usuario: UsuarioActual,
  ) {
    await this.acceso.exigirEscritura(usuario);
    const registro = await this.acceso.registroVisible(registroId, usuario);
    if (!registro.activo)
      throw new BadRequestException('El registro está cancelado');
    if (!texto?.trim() && !archivo)
      throw new BadRequestException(
        'Escribe un comentario o adjunta un archivo.',
      );

    const filePath = archivo
      ? await this.archivos.guardar(archivo, CARPETA_COMENTARIOS)
      : SIN_ARCHIVO;
    const comentario = await this.comentarioModel.create({
      regId: registroId,
      userRfc: usuario.rfc,
      comment: texto?.trim() || 'DOCUMENTO',
      commentTo: para?.trim().toUpperCase() || 'GLOBAL',
      filePath,
      status: '1',
      notificacion: true,
    });
    return { id: Number(comentario.id) };
  }

  async responder(
    comentarioId: number,
    texto: string | undefined,
    archivo: Express.Multer.File | undefined,
    usuario: UsuarioActual,
  ) {
    await this.acceso.exigirEscritura(usuario);
    const comentario = await this.comentarioModel.findByPk(comentarioId);
    if (!comentario) throw new NotFoundException('El comentario no existe');
    await this.acceso.registroVisible(comentario.regId, usuario);
    if (!texto?.trim() && !archivo)
      throw new BadRequestException(
        'Escribe una respuesta o adjunta un archivo.',
      );

    const filePath = archivo
      ? await this.archivos.guardar(archivo, CARPETA_COMENTARIOS)
      : SIN_ARCHIVO;
    const respuesta = await this.respuestaModel.create({
      regId: comentario.regId,
      idComment: comentarioId,
      userRfc: usuario.rfc,
      comment: texto?.trim() || 'DOCUMENTO',
      filePath,
      notificacion: true,
    });
    return { id: Number(respuesta.id) };
  }

  async enviarArchivoComentario(
    id: number,
    usuario: UsuarioActual,
    res: Response,
  ) {
    const comentario = await this.comentarioModel.findByPk(id);
    if (!comentario) throw new NotFoundException('El comentario no existe');
    await this.acceso.registroVisible(comentario.regId, usuario);
    this.archivos.enviar(res, comentario.filePath);
  }

  async enviarArchivoRespuesta(
    id: number,
    usuario: UsuarioActual,
    res: Response,
  ) {
    const respuesta = await this.respuestaModel.findByPk(id);
    if (!respuesta) throw new NotFoundException('La respuesta no existe');
    await this.acceso.registroVisible(respuesta.regId, usuario);
    this.archivos.enviar(res, respuesta.filePath);
  }
}
