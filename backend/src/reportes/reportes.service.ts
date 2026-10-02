import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import * as XLSX from 'xlsx';
import { Registro } from '../database/models/registro.model';
import {
  RegistroAtencion,
  TIPO_TURNO_ATENCION,
} from '../database/models/registro-atencion.model';
import { TipoAtencion } from '../database/models/catalogos-simples.model';
import { AccesoService } from '../common/acceso.service';
import { PadronService } from '../common/padron.service';
import { esAdministrador, UsuarioActual } from '../common/usuario-actual';
import { CatalogosService } from '../catalogos/catalogos.service';
import { estatusRegistro, nombreRemitente } from '../registros/registro-vista';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class ReportesService {
  constructor(
    @InjectModel(Registro) private readonly registroModel: typeof Registro,
    private readonly acceso: AccesoService,
    private readonly padron: PadronService,
    private readonly catalogos: CatalogosService,
  ) {}

  /** Totales del periodo y turnos de atención pendientes por persona. */
  async resumen(
    usuario: UsuarioActual,
    desde: string,
    hasta: string,
    todos: boolean,
  ) {
    const registros = await this.consultar(usuario, desde, hasta, todos);

    const totales = {
      total: registros.length,
      pendientes: 0,
      concluidos: 0,
      cancelados: 0,
    };
    const pendientesPorRfc = new Map<string, number>();
    for (const r of registros) {
      const estatus = estatusRegistro(r);
      if (estatus === 'Pendiente') totales.pendientes++;
      else if (estatus === 'Concluido') totales.concluidos++;
      else totales.cancelados++;

      if (!r.activo) continue;
      for (const t of r.turnos ?? []) {
        if (
          t.tipoAtencion === TIPO_TURNO_ATENCION &&
          t.activo &&
          !t.statusAtencion
        ) {
          pendientesPorRfc.set(
            t.userRfc,
            (pendientesPorRfc.get(t.userRfc) ?? 0) + 1,
          );
        }
      }
    }

    const nombres = await this.padron.nombresPorRfc([
      ...pendientesPorRfc.keys(),
    ]);
    const pendientesPorPersona = [...pendientesPorRfc.entries()]
      .map(([rfc, pendientes]) => ({
        rfc,
        nombre: nombres.get(rfc) ?? rfc,
        pendientes,
      }))
      .sort((a, b) => b.pendientes - a.pendientes);

    return { ...totales, pendientesPorPersona };
  }

  /** Concentrado del periodo en Excel, un renglón por documento. */
  async concentradoExcel(
    usuario: UsuarioActual,
    desde: string,
    hasta: string,
    todos: boolean,
  ): Promise<Buffer> {
    const registros = await this.consultar(usuario, desde, hasta, todos);
    const rfcs = registros.flatMap((r) => [
      r.remitenteRfc,
      ...(r.turnos ?? []).map((t) => t.userRfc),
    ]);
    const [nombres, series] = await Promise.all([
      this.padron.nombresPorRfc(rfcs),
      this.catalogos.nombresSeries(registros.map((r) => r.serieId)),
    ]);
    const lista = (turnos: RegistroAtencion[], tipo: string) =>
      turnos
        .filter((t) => t.tipoAtencion === tipo && t.activo)
        .map(
          (t) =>
            `${nombres.get(t.userRfc) ?? t.userRfc}${t.statusAtencion ? ' (atendido)' : ''}`,
        )
        .join('; ');

    const filas = registros.map((r) => ({
      Folio: r.folio,
      'Fecha de recepción': r.fechaRecepcion,
      'Fecha del documento': r.fechaDocumento ?? '',
      Referencia: r.referenciaDocumento ?? '',
      Remitente: nombreRemitente(r, nombres),
      Serie: series.get(r.serieId) ?? '',
      Asunto: r.descripcionDoc,
      Indicaciones: r.tituloDoc,
      Prioridad: r.tipo?.tipo ?? '',
      'Fecha límite': r.fechaLimiteAtencion,
      Estatus: estatusRegistro(r),
      'Turnado para atención': lista(r.turnos ?? [], TIPO_TURNO_ATENCION),
      'Turnado para conocimiento': lista(r.turnos ?? [], 'C'),
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja['!cols'] = [14, 14, 14, 22, 32, 24, 60, 40, 12, 14, 12, 50, 50].map(
      (wch) => ({ wch }),
    );
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Concentrado');
    return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private async consultar(
    usuario: UsuarioActual,
    desde: string,
    hasta: string,
    todos: boolean,
  ) {
    if (!FECHA.test(desde ?? '') || !FECHA.test(hasta ?? '')) {
      throw new BadRequestException(
        'Indica el periodo (desde/hasta) como AAAA-MM-DD',
      );
    }
    if (desde > hasta) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la final',
      );
    }
    const where: WhereOptions = {
      fechaRecepcion: { [Op.between]: [desde, hasta] },
    };
    if (!(todos && esAdministrador(usuario))) {
      const titular = await this.acceso.titular(usuario);
      Object.assign(where, { userRegistro: titular.userId });
    }
    return this.registroModel.findAll({
      where,
      include: [
        {
          model: RegistroAtencion,
          as: 'turnos',
          // Consulta aparte: unirlos en un solo JOIN con los textos largos tardaba ~1 min.
          separate: true,
          attributes: [
            'id',
            'registroId',
            'userRfc',
            'tipoAtencion',
            'statusAtencion',
            'activo',
          ],
        },
        { model: TipoAtencion, as: 'tipo', attributes: ['id', 'tipo'] },
      ],
      order: [
        ['fechaRecepcion', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  }
}
