import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, literal } from 'sequelize';
import { Agenda } from '../database/models/agenda.model';
import { Registro } from '../database/models/registro.model';
import { AccesoService } from '../common/acceso.service';
import { UsuarioActual } from '../common/usuario-actual';
import { textoFechaHora } from '../common/fecha-mexico.util';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class AgendaService {
  constructor(
    @InjectModel(Agenda) private readonly agendaModel: typeof Agenda,
    private readonly acceso: AccesoService,
  ) {}

  /**
   * Fechas límite de los documentos que el usuario registró o que le turnaron, dentro del rango.
   * (Laravel solo mostraba los turnados; aquí se agregan también los propios.)
   */
  async eventos(usuario: UsuarioActual, desde: string, hasta: string) {
    if (!FECHA.test(desde ?? '') || !FECHA.test(hasta ?? '')) {
      throw new BadRequestException(
        'Indica el rango de fechas (desde/hasta) como AAAA-MM-DD',
      );
    }
    const titular = await this.acceso.titular(usuario);
    const sequelize = this.agendaModel.sequelize!;
    const rfc = sequelize.escape(titular.rfc);
    const userId = Number(titular.userId);

    const eventos = await this.agendaModel.findAll({
      where: {
        status: true,
        start: { [Op.between]: [`${desde} 00:00:00`, `${hasta} 23:59:59`] },
        // Solo se revisan los eventos del rango (índice por fecha) y, para cada uno, si el registro
        // es del titular o si tiene un turno en él (índice por registro_id). Un IN con subconsulta
        // sobre registro_atencions recorría la tabla completa (~4 s).
        [Op.and]: [
          literal(
            `(\`registro\`.\`user_registro\` = ${userId} OR EXISTS (SELECT 1 FROM registro_atencions ra ` +
              `WHERE ra.registro_id = \`Agenda\`.\`registro_id\` AND ra.user_rfc = ${rfc} AND ra.activo = 1))`,
          ),
        ],
      },
      include: [
        {
          model: Registro,
          as: 'registro',
          attributes: [],
          where: { activo: true },
          required: true,
        },
      ],
      order: [['start', 'ASC']],
    });

    return eventos.map((e) => ({
      id: Number(e.id),
      registroId: Number(e.registroId),
      titulo: e.title,
      descripcion: e.descripcion,
      inicio: textoFechaHora(e.start),
      fin: textoFechaHora(e.end),
      color: e.color,
    }));
  }
}
