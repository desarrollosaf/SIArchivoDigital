import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import {
  Agenda,
  COLOR_AGENDA_CONCLUIDO,
  COLOR_AGENDA_ORDINARIO,
  COLOR_AGENDA_URGENTE,
} from '../database/models/agenda.model';
import { Registro } from '../database/models/registro.model';
import { aLatin1 } from './latin1.util';

const TIPO_ATENCION_ORDINARIO = 1;
/** Serie "EVENTOS" (Laravel la escribía como 010101, octal de PHP). */
const SERIE_EVENTOS = 4161;

function hora(valor: string | null | undefined, porDefecto: string): string {
  if (!valor) return porDefecto;
  return valor.length === 5 ? `${valor}:00` : valor.slice(0, 8);
}

/**
 * Mantiene el evento de agenda de cada registro (uno por fecha límite de atención), igual que lo
 * hacía Laravel: amarillo si es ordinario, naranja si es urgente y gris al concluirse.
 */
@Injectable()
export class AgendaSyncService {
  constructor(
    @InjectModel(Agenda)
    private readonly agendaModel: typeof Agenda,
  ) {}

  async sincronizar(
    registro: Registro,
    transaction?: Transaction,
  ): Promise<void> {
    await this.agendaModel.destroy({
      where: { registroId: registro.id },
      transaction,
    });
    if (!registro.activo) return;

    const fecha = registro.fechaLimiteAtencion;
    await this.agendaModel.create(
      {
        registroId: registro.id,
        title: registro.folio,
        descripcion: registro.descripcionDoc,
        start: `${fecha} ${hora(registro.horaAtencion, '00:00:00')}`,
        end: `${fecha} ${hora(registro.horaTermino, '23:59:00')}`,
        empieza: fecha,
        termina: fecha,
        hora: '00:00:00',
        color: this.color(registro),
        status: true,
      },
      { transaction },
    );
  }

  async actualizarColor(
    registro: Registro,
    transaction?: Transaction,
  ): Promise<void> {
    await this.agendaModel.update(
      { color: this.color(registro) },
      { where: { registroId: registro.id }, transaction },
    );
  }

  async eliminar(registroId: number, transaction?: Transaction): Promise<void> {
    await this.agendaModel.destroy({ where: { registroId }, transaction });
    await this.eliminarDePresidencia(registroId, transaction);
  }

  /**
   * Los documentos de la serie EVENTOS (4161) aparecen además en la Agenda de Presidencia, igual
   * que en Laravel. `start`/`end` son TIMESTAMP guardados en UTC; la hora capturada es de México
   * (UTC-6 fijo desde 2022), por eso se convierte al guardar.
   */
  async sincronizarPresidencia(
    registro: Registro,
    transaction?: Transaction,
  ): Promise<void> {
    await this.eliminarDePresidencia(registro.id, transaction);
    if (!registro.activo || Number(registro.serieId) !== SERIE_EVENTOS) return;

    const fecha = registro.fechaLimiteAtencion;
    await this.agendaModel.sequelize!.query(
      'INSERT INTO agenda_presidencia ' +
        '(registro_id, title, descipcion, `start`, `end`, empieza, termina, status, created_at, updated_at) ' +
        "VALUES (:registroId, :titulo, :descripcion, CONVERT_TZ(:inicio, '-06:00', '+00:00'), " +
        "CONVERT_TZ(:fin, '-06:00', '+00:00'), :fecha, :fecha, 1, NOW(), NOW())",
      {
        replacements: {
          registroId: registro.id,
          // agenda_presidencia es latin1: el asunto (utf8mb4) se copia sin lo que no cabe.
          titulo: aLatin1(registro.folio),
          descripcion: aLatin1(registro.descripcionDoc),
          inicio: `${fecha} ${hora(registro.horaAtencion, '00:00:00')}`,
          fin: `${fecha} ${hora(registro.horaTermino, '00:00:00')}`,
          fecha,
        },
        transaction,
      },
    );
  }

  private async eliminarDePresidencia(
    registroId: number,
    transaction?: Transaction,
  ): Promise<void> {
    await this.agendaModel.sequelize!.query(
      'DELETE FROM agenda_presidencia WHERE registro_id = :registroId',
      { replacements: { registroId }, transaction },
    );
  }

  private color(registro: Registro): string {
    if (!registro.status) return COLOR_AGENDA_CONCLUIDO;
    return Number(registro.tipoAtencion) === TIPO_ATENCION_ORDINARIO
      ? COLOR_AGENDA_ORDINARIO
      : COLOR_AGENDA_URGENTE;
  }
}
