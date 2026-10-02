import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, literal } from 'sequelize';
import { Registro } from '../database/models/registro.model';
import { AccesoService } from '../common/acceso.service';
import { PadronService } from '../common/padron.service';
import { tieneArchivo } from '../common/archivos.service';
import { UsuarioActual } from '../common/usuario-actual';
import { CatalogosService } from '../catalogos/catalogos.service';
import { estatusRegistro, nombreRemitente } from '../registros/registro-vista';

/** Plazo en archivo de trámite cuando la serie no define `duracionSistema` (2 años). */
const DIAS_TRAMITE_POR_DEFECTO = 730;

@Injectable()
export class ConcentracionService {
  constructor(
    @InjectModel(Registro) private readonly registroModel: typeof Registro,
    private readonly acceso: AccesoService,
    private readonly padron: PadronService,
    private readonly catalogos: CatalogosService,
  ) {}

  /**
   * Documentos propios que ya cumplieron su plazo en archivo de trámite (según su serie) y deben
   * transferirse al archivo de concentración.
   */
  async listar(usuario: UsuarioActual) {
    const titular = await this.acceso.titular(usuario);
    const registros = await this.registroModel.findAll({
      attributes: {
        include: [
          [
            literal('DATEDIFF(NOW(), `Registro`.`created_at`)'),
            'diasTranscurridos',
          ],
        ],
      },
      where: {
        userRegistro: titular.userId,
        [Op.and]: [
          literal(
            '`Registro`.`created_at` < DATE_SUB(NOW(), INTERVAL COALESCE(' +
              '(SELECT s.duracionSistema FROM series s WHERE s.id = `Registro`.`serie_id`), ' +
              `${DIAS_TRAMITE_POR_DEFECTO}) DAY)`,
          ),
        ],
      },
      order: [['createdAt', 'ASC']],
    });

    const [nombres, series] = await Promise.all([
      this.padron.nombresPorRfc(registros.map((r) => r.remitenteRfc)),
      this.catalogos.nombresSeries(registros.map((r) => r.serieId)),
    ]);
    return registros.map((r) => ({
      id: Number(r.id),
      folio: r.folio,
      asunto: r.descripcionDoc,
      remitente: nombreRemitente(r, nombres),
      serie: series.get(r.serieId) ?? '',
      fechaRecepcion: r.fechaRecepcion,
      creado: r.createdAt,
      diasTranscurridos: Number(r.get('diasTranscurridos')),
      estatus: estatusRegistro(r),
      tieneArchivo: tieneArchivo(r.path),
    }));
  }
}
