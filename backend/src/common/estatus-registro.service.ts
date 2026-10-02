import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Registro } from '../database/models/registro.model';
import {
  RegistroAtencion,
  TIPO_TURNO_ATENCION,
} from '../database/models/registro-atencion.model';
import { AgendaSyncService } from './agenda-sync.service';

/**
 * Un registro queda concluido cuando todos sus turnos de atención activos están atendidos, y
 * vuelve a pendiente si se le agrega alguien más para atención. Los registros que solo tienen
 * turnos de conocimiento no cambian (así se comportaba Laravel).
 */
@Injectable()
export class EstatusRegistroService {
  constructor(
    @InjectModel(Registro)
    private readonly registroModel: typeof Registro,
    @InjectModel(RegistroAtencion)
    private readonly atencionModel: typeof RegistroAtencion,
    private readonly agenda: AgendaSyncService,
  ) {}

  async recalcular(
    registroId: number,
    transaction?: Transaction,
  ): Promise<void> {
    const registro = await this.registroModel.findByPk(registroId, {
      transaction,
    });
    if (!registro || !registro.activo) return;

    const base = {
      registroId,
      tipoAtencion: TIPO_TURNO_ATENCION,
      activo: true,
    };
    const [total, pendientes] = await Promise.all([
      this.atencionModel.count({ where: base, transaction }),
      this.atencionModel.count({
        where: { ...base, statusAtencion: false },
        transaction,
      }),
    ]);
    if (total === 0) return;

    const pendiente = pendientes > 0;
    if (!!registro.status !== pendiente) {
      await registro.update({ status: pendiente }, { transaction });
      await this.agenda.actualizarColor(registro, transaction);
    }
  }
}
