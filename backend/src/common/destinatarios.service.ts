import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Miembro } from '../database/models/grupo.model';

const PREFIJO_GRUPO = 'G:';

/**
 * Convierte la lista que manda el formulario (RFCs y grupos "G:<id>") en RFCs individuales,
 * sin repetidos. Sustituye la regla de Laravel que detectaba grupos por "strlen($x) == 1".
 */
@Injectable()
export class DestinatariosService {
  constructor(
    @InjectModel(Miembro)
    private readonly miembroModel: typeof Miembro,
  ) {}

  async expandir(ids: string[] | undefined): Promise<string[]> {
    const limpios = (ids ?? []).map((id) => String(id).trim()).filter(Boolean);
    const grupos = limpios
      .filter((id) => id.startsWith(PREFIJO_GRUPO))
      .map((id) => id.slice(PREFIJO_GRUPO.length));
    const rfcs = limpios
      .filter((id) => !id.startsWith(PREFIJO_GRUPO))
      .map((rfc) => rfc.toUpperCase());

    if (grupos.length) {
      const miembros = await this.miembroModel.findAll({
        where: { idGroup: { [Op.in]: grupos } },
      });
      rfcs.push(...miembros.map((m) => m.userRfc.toUpperCase()));
    }
    return [...new Set(rfcs)];
  }

  /** Atención y conocimiento ya expandidos; quien está para atención no se repite en conocimiento. */
  async separar(
    atencion: string[] | undefined,
    conocimiento: string[] | undefined,
  ) {
    const paraAtencion = await this.expandir(atencion);
    const paraConocimiento = (await this.expandir(conocimiento)).filter(
      (rfc) => !paraAtencion.includes(rfc),
    );
    return { atencion: paraAtencion, conocimiento: paraConocimiento };
  }
}
