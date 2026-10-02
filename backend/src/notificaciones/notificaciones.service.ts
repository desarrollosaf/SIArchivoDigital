import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Registro } from '../database/models/registro.model';
import { RegistroAtencion } from '../database/models/registro-atencion.model';
import { Comentario } from '../database/models/comentario.model';
import { Respuesta } from '../database/models/respuesta.model';
import { PadronService } from '../common/padron.service';
import { UsuarioActual } from '../common/usuario-actual';

export type TipoNotificacion = 'turno' | 'comentario' | 'respuesta';

const LIMITE_LISTA = 30;

/**
 * Avisos sin leer: turnos nuevos, comentarios dirigidos al usuario y respuestas a sus
 * comentarios. Usan la columna `notificacion` de cada tabla, igual que en Laravel.
 */
@Injectable()
export class NotificacionesService {
  constructor(
    @InjectModel(RegistroAtencion)
    private readonly atencionModel: typeof RegistroAtencion,
    @InjectModel(Comentario)
    private readonly comentarioModel: typeof Comentario,
    @InjectModel(Respuesta) private readonly respuestaModel: typeof Respuesta,
    private readonly padron: PadronService,
  ) {}

  async resumen(usuario: UsuarioActual) {
    const [turnos, comentarios, respuestas] = await Promise.all([
      this.atencionModel.count({ ...this.consultaTurnos(usuario.rfc) }),
      this.comentarioModel.count({ where: this.whereComentarios(usuario.rfc) }),
      this.respuestaModel.count({ ...this.consultaRespuestas(usuario.rfc) }),
    ]);
    return {
      turnos,
      comentarios,
      respuestas,
      total: turnos + comentarios + respuestas,
    };
  }

  async listar(usuario: UsuarioActual) {
    const [turnos, comentarios, respuestas] = await Promise.all([
      this.atencionModel.findAll({
        ...this.consultaTurnos(usuario.rfc),
        order: [['createdAt', 'DESC']],
        limit: LIMITE_LISTA,
      }),
      this.comentarioModel.findAll({
        where: this.whereComentarios(usuario.rfc),
        include: [
          { model: Registro, as: 'registro', attributes: ['id', 'folio'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: LIMITE_LISTA,
      }),
      this.respuestaModel.findAll({
        ...this.consultaRespuestas(usuario.rfc),
        order: [['createdAt', 'DESC']],
        limit: LIMITE_LISTA,
      }),
    ]);

    const nombres = await this.padron.nombresPorRfc([
      ...turnos.map((t) => t.userTurna ?? ''),
      ...comentarios.map((c) => c.userRfc),
      ...respuestas.map((r) => r.userRfc),
    ]);
    const de = (rfc: string | null) => (rfc ? (nombres.get(rfc) ?? rfc) : null);

    const items = [
      ...turnos.map((t) => ({
        tipo: 'turno' as const,
        id: Number(t.id),
        registroId: Number(t.registroId),
        folio: t.registro.folio,
        de: de(t.userTurna),
        detalle:
          t.tipoAtencion === 'A'
            ? 'Te turnaron un documento para atención'
            : 'Te turnaron un documento para conocimiento',
        fecha: t.createdAt,
      })),
      ...comentarios.map((c) => ({
        tipo: 'comentario' as const,
        id: Number(c.id),
        registroId: Number(c.regId),
        folio: c.registro?.folio ?? '',
        de: de(c.userRfc),
        detalle: 'Te dejó un comentario',
        fecha: c.createdAt,
      })),
      ...respuestas.map((r) => ({
        tipo: 'respuesta' as const,
        id: Number(r.id),
        registroId: Number(r.regId),
        folio: r.comentario?.registro?.folio ?? '',
        de: de(r.userRfc),
        detalle: 'Respondió tu comentario',
        fecha: r.createdAt,
      })),
    ];
    return items
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, LIMITE_LISTA);
  }

  async marcarLeida(
    tipo: string,
    id: number,
    usuario: UsuarioActual,
  ): Promise<void> {
    switch (tipo as TipoNotificacion) {
      case 'turno':
        await this.atencionModel.update(
          { notificacion: false },
          { where: { id, userRfc: usuario.rfc } },
        );
        return;
      case 'comentario':
        await this.comentarioModel.update(
          { notificacion: false },
          { where: { id, commentTo: usuario.rfc } },
        );
        return;
      case 'respuesta': {
        const respuesta = await this.respuestaModel.findByPk(id, {
          include: [
            { model: Comentario, as: 'comentario', attributes: ['userRfc'] },
          ],
        });
        if (respuesta?.comentario?.userRfc === usuario.rfc) {
          await respuesta.update({ notificacion: false });
        }
        return;
      }
      default:
        throw new BadRequestException('Tipo de notificación desconocido');
    }
  }

  async marcarTodasLeidas(usuario: UsuarioActual): Promise<void> {
    const respuestas = await this.respuestaModel.findAll({
      ...this.consultaRespuestas(usuario.rfc),
      attributes: ['id'],
    });
    await Promise.all([
      this.atencionModel.update(
        { notificacion: false },
        { where: { userRfc: usuario.rfc, notificacion: true } },
      ),
      this.comentarioModel.update(
        { notificacion: false },
        { where: this.whereComentarios(usuario.rfc) },
      ),
      respuestas.length
        ? this.respuestaModel.update(
            { notificacion: false },
            { where: { id: { [Op.in]: respuestas.map((r) => r.id) } } },
          )
        : Promise.resolve(),
    ]);
  }

  private consultaTurnos(rfc: string) {
    return {
      where: { userRfc: rfc, notificacion: true, activo: true },
      include: [
        {
          model: Registro,
          as: 'registro',
          attributes: ['id', 'folio'],
          where: { activo: true },
          required: true,
        },
      ],
    };
  }

  private whereComentarios(rfc: string) {
    return { commentTo: rfc, notificacion: true, userRfc: { [Op.ne]: rfc } };
  }

  /** Respuestas, de otras personas, a comentarios que escribió el usuario. */
  private consultaRespuestas(rfc: string) {
    return {
      where: { notificacion: true, userRfc: { [Op.ne]: rfc } },
      include: [
        {
          model: Comentario,
          as: 'comentario',
          attributes: ['id', 'userRfc'],
          where: { userRfc: rfc },
          required: true,
          include: [
            { model: Registro, as: 'registro', attributes: ['id', 'folio'] },
          ],
        },
      ],
    };
  }
}
