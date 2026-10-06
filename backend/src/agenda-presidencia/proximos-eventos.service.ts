import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Response } from 'express';
import { Registro } from '../database/models/registro.model';
import { RegistroAtencion } from '../database/models/registro-atencion.model';
import { SERIE_EVENTOS } from '../catalogos/catalogos.service';
import { ArchivosService, tieneArchivo } from '../common/archivos.service';
import { fechaHoyMexico } from '../common/fecha-mexico.util';
import { PadronService } from '../common/padron.service';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-10-06" -> "2026-10-07". */
function diaSiguiente(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * "Próximos eventos" (Laravel: AgendaController@agendaEventos/@getpdfEventos): los documentos
 * de la serie EVENTOS con fecha de atención de mañana, para preparar el día.
 *
 * Laravel tenía fija la serie 2, que ya está desactivada y no tiene registros (la pantalla salía
 * vacía); aquí se usa la serie EVENTOS vigente, la misma que alimenta la agenda.
 */
@Injectable()
export class ProximosEventosService {
  constructor(
    @InjectModel(Registro) private readonly registroModel: typeof Registro,
    @InjectModel(RegistroAtencion)
    private readonly atencionModel: typeof RegistroAtencion,
    private readonly padron: PadronService,
    private readonly archivos: ArchivosService,
  ) {}

  async listar(fecha?: string) {
    if (fecha && !FECHA.test(fecha)) {
      throw new BadRequestException('La fecha no es válida.');
    }
    const dia = fecha || diaSiguiente(fechaHoyMexico());
    const registros = await this.registroModel.findAll({
      attributes: [
        'id',
        'folio',
        'tituloDoc',
        'descripcionDoc',
        'horaAtencion',
        'horaTermino',
        'nombreEvento',
        'path',
      ],
      where: { serieId: SERIE_EVENTOS, activo: true, fechaLimiteAtencion: dia },
      order: [
        ['horaAtencion', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    const ids = registros.map((r) => r.id);
    const turnos = ids.length
      ? await this.atencionModel.findAll({
          attributes: ['registroId', 'userRfc'],
          where: { registroId: ids, activo: true, tipoAtencion: 'A' },
        })
      : [];
    const nombres = await this.padron.nombresPorRfc(
      turnos.map((t) => t.userRfc),
    );

    return {
      fecha: dia,
      eventos: registros.map((r) => ({
        id: Number(r.id),
        folio: r.folio,
        horaInicio: r.horaAtencion?.slice(0, 5) ?? null,
        horaTermino: r.horaTermino?.slice(0, 5) ?? null,
        nombreEvento: r.nombreEvento,
        indicaciones: r.tituloDoc,
        asunto: r.descripcionDoc,
        atencion: turnos
          .filter((t) => Number(t.registroId) === Number(r.id))
          .map((t) => nombres.get(t.userRfc) ?? t.userRfc),
        tieneArchivo: tieneArchivo(r.path),
      })),
    };
  }

  /** Solo documentos de la serie EVENTOS: el rol de Presidencia no los ve por otra vía. */
  async enviarArchivo(id: number, res: Response) {
    const r = await this.registroModel.findOne({
      attributes: ['id', 'path'],
      where: { id, serieId: SERIE_EVENTOS },
    });
    if (!r) throw new NotFoundException('No se encontró el evento.');
    this.archivos.enviar(res, r.path);
  }
}
