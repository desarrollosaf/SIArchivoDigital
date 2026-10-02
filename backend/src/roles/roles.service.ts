import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Rol } from '../database/models/rol.model';
import { UsuarioRol } from '../database/models/usuario-rol.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { nombreCompleto } from '../common/padron.service';

export const ROL_USUARIO_DEFAULT = 'usuario';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Rol)
    private readonly rolModel: typeof Rol,
    @InjectModel(UsuarioRol)
    private readonly usuarioRolModel: typeof UsuarioRol,
    @InjectModel(SUsuario, 'external')
    private readonly sUsuarioModel: typeof SUsuario,
  ) {}

  async getRolForRfc(rfc: string): Promise<string> {
    const asignacion = await this.usuarioRolModel.findOne({
      where: { rfc: rfc.trim().toUpperCase() },
      include: [{ model: Rol }],
    });

    return asignacion?.rol?.clave ?? ROL_USUARIO_DEFAULT;
  }

  async listRoles(): Promise<Rol[]> {
    return this.rolModel.findAll({ order: [['id', 'ASC']] });
  }

  async searchUsuarios(search: string, limit = 20) {
    const term = search?.trim();

    const where = term
      ? {
          [Op.or]: [
            { N_Usuario: { [Op.like]: `%${term.toUpperCase()}%` } },
            { Nombre: { [Op.like]: `%${term.toUpperCase()}%` } },
            { A_Paterno: { [Op.like]: `%${term.toUpperCase()}%` } },
            { A_Materno: { [Op.like]: `%${term.toUpperCase()}%` } },
          ],
        }
      : {};

    const usuarios = await this.sUsuarioModel.findAll({
      where,
      limit,
      order: [['Nombre', 'ASC']],
    });

    return usuarios.map((u) => ({
      rfc: u.N_Usuario,
      nombre: nombreCompleto(u),
      puesto: u.Puesto,
    }));
  }

  async listAsignaciones() {
    const asignaciones = await this.usuarioRolModel.findAll({
      include: [{ model: Rol }],
      order: [['created_at', 'DESC']],
    });

    if (asignaciones.length === 0) {
      return [];
    }

    const rfcs = asignaciones.map((a) => a.rfc);
    const usuarios = await this.sUsuarioModel.findAll({
      where: { N_Usuario: { [Op.in]: rfcs } },
    });
    const usuariosPorRfc = new Map(usuarios.map((u) => [u.N_Usuario, u]));

    return asignaciones.map((a) => {
      const usuario = usuariosPorRfc.get(a.rfc);
      return {
        rfc: a.rfc,
        nombre: usuario ? nombreCompleto(usuario) : null,
        puesto: usuario?.Puesto ?? null,
        rol: { id: a.rol.id, clave: a.rol.clave, nombre: a.rol.nombre },
      };
    });
  }

  async upsertAsignacion(rfc: string, rolId: number) {
    const rfcNormalizado = rfc.trim().toUpperCase();

    const rol = await this.rolModel.findByPk(rolId);
    if (!rol) {
      throw new BadRequestException('El rol indicado no existe');
    }

    const [asignacion] = await this.usuarioRolModel.upsert({
      rfc: rfcNormalizado,
      rolId,
    });

    return {
      rfc: asignacion.rfc,
      rol: { id: rol.id, clave: rol.clave, nombre: rol.nombre },
    };
  }

  async removeAsignacion(rfc: string): Promise<void> {
    const deleted = await this.usuarioRolModel.destroy({
      where: { rfc: rfc.trim().toUpperCase() },
    });

    if (!deleted) {
      throw new NotFoundException('No hay un rol asignado para ese usuario');
    }
  }
}
