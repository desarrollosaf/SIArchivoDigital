import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Grupo, Miembro } from '../database/models/grupo.model';
import { PadronService } from '../common/padron.service';

export interface GrupoPayload {
  grupo: string;
  miembros: string[];
}

/** Grupos de destinatarios: permiten turnar a varias personas eligiendo un solo nombre. */
@Injectable()
export class GruposService {
  constructor(
    @InjectModel(Grupo) private readonly grupoModel: typeof Grupo,
    @InjectModel(Miembro) private readonly miembroModel: typeof Miembro,
    private readonly padron: PadronService,
  ) {}

  async listar() {
    const grupos = await this.grupoModel.findAll({
      where: { activo: true },
      order: [['grupo', 'ASC']],
    });
    const miembros = await this.miembroModel.findAll({
      where: { idGroup: { [Op.in]: grupos.map((g) => String(g.id)) } },
    });
    const nombres = await this.padron.nombresPorRfc(
      miembros.map((m) => m.userRfc),
    );
    return grupos.map((g) => ({
      id: Number(g.id),
      grupo: g.grupo,
      miembros: miembros
        .filter((m) => m.idGroup === String(g.id))
        .map((m) => ({
          rfc: m.userRfc,
          nombre: nombres.get(m.userRfc) ?? m.userRfc,
        })),
    }));
  }

  async crear(payload: GrupoPayload) {
    return this.grupoModel.sequelize!.transaction(async (transaction) => {
      const grupo = await this.grupoModel.create(
        { grupo: payload.grupo, activo: true },
        { transaction },
      );
      await this.guardarMiembros(
        Number(grupo.id),
        payload.miembros,
        transaction,
      );
      return { id: Number(grupo.id) };
    });
  }

  async editar(id: number, payload: GrupoPayload) {
    const grupo = await this.grupoModel.findByPk(id);
    if (!grupo || !grupo.activo)
      throw new NotFoundException('El grupo no existe');
    await this.grupoModel.sequelize!.transaction(async (transaction) => {
      await grupo.update({ grupo: payload.grupo }, { transaction });
      await this.miembroModel.destroy({
        where: { idGroup: String(id) },
        transaction,
      });
      await this.guardarMiembros(id, payload.miembros, transaction);
    });
  }

  /** Baja lógica, como en Laravel: el grupo deja de ofrecerse como destinatario. */
  async eliminar(id: number) {
    const grupo = await this.grupoModel.findByPk(id);
    if (!grupo) throw new NotFoundException('El grupo no existe');
    await grupo.update({ activo: false });
  }

  private async guardarMiembros(
    id: number,
    rfcs: string[],
    transaction: Transaction,
  ) {
    const unicos = [
      ...new Set(rfcs.map((r) => r.trim().toUpperCase()).filter(Boolean)),
    ];
    if (unicos.length) {
      await this.miembroModel.bulkCreate(
        unicos.map((userRfc) => ({ idGroup: String(id), userRfc })),
        { transaction },
      );
    }
  }
}
