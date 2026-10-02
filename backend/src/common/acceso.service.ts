import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Registro } from '../database/models/registro.model';
import { RegistroAtencion } from '../database/models/registro-atencion.model';
import { UsLectura } from '../database/models/us-lectura.model';
import { esAdministrador, UsuarioActual } from './usuario-actual';

/** De quién son las bandejas que se están viendo. */
export interface Titular {
  rfc: string;
  /** `users_safs.id` del titular. */
  userId: number;
  /** true cuando un lector delegado consulta las bandejas de su jefe: no puede modificar nada. */
  soloLectura: boolean;
}

@Injectable()
export class AccesoService {
  constructor(
    @InjectModel(UsLectura)
    private readonly usLecturaModel: typeof UsLectura,
    @InjectModel(Registro)
    private readonly registroModel: typeof Registro,
    @InjectModel(RegistroAtencion)
    private readonly atencionModel: typeof RegistroAtencion,
  ) {}

  /**
   * Si el usuario es lector delegado (tabla us_lecturas), sus bandejas son las de su jefe y en
   * modo solo lectura; si no, son las suyas.
   */
  async titular(usuario: UsuarioActual): Promise<Titular> {
    const delegacion = await this.usLecturaModel.findOne({
      where: { userRfc: usuario.rfc, status: true },
    });
    if (delegacion?.rfcJefe && delegacion.idJefe) {
      return {
        rfc: delegacion.rfcJefe,
        userId: delegacion.idJefe,
        soloLectura: true,
      };
    }
    return { rfc: usuario.rfc, userId: usuario.sub, soloLectura: false };
  }

  async exigirEscritura(usuario: UsuarioActual): Promise<void> {
    const titular = await this.titular(usuario);
    if (titular.soloLectura) {
      throw new ForbiddenException('Tu acceso es de solo lectura');
    }
  }

  /**
   * Puede ver un registro quien lo capturó, quien tiene (o turnó) un turno en él, el lector
   * delegado de cualquiera de ellos, y el administrador.
   */
  async registroVisible(
    registroId: number,
    usuario: UsuarioActual,
  ): Promise<Registro> {
    const registro = await this.registroModel.findByPk(registroId);
    if (!registro) {
      throw new NotFoundException('El registro no existe');
    }
    if (esAdministrador(usuario)) return registro;

    const titular = await this.titular(usuario);
    if ([usuario.sub, titular.userId].includes(Number(registro.userRegistro)))
      return registro;

    const rfcs = [...new Set([usuario.rfc, titular.rfc])];
    const turno = await this.atencionModel.findOne({
      attributes: ['id'],
      where: {
        registroId,
        [Op.or]: [
          { userRfc: { [Op.in]: rfcs } },
          { userTurna: { [Op.in]: rfcs } },
        ],
      },
    });
    if (!turno) {
      throw new ForbiddenException('No tienes acceso a este registro');
    }
    return registro;
  }

  /** Solo quien capturó el registro (o el administrador) puede editarlo o cancelarlo. */
  async registroPropio(
    registroId: number,
    usuario: UsuarioActual,
  ): Promise<Registro> {
    const registro = await this.registroModel.findByPk(registroId);
    if (!registro) {
      throw new NotFoundException('El registro no existe');
    }
    if (
      !esAdministrador(usuario) &&
      Number(registro.userRegistro) !== usuario.sub
    ) {
      throw new ForbiddenException(
        'Solo quien registró el documento puede modificarlo',
      );
    }
    return registro;
  }
}
