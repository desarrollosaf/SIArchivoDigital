import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, QueryTypes } from 'sequelize';
import { Registro } from '../database/models/registro.model';
import { ComisionLegislativo } from '../database/models/comision-legislativo.model';
import { PadronService } from '../common/padron.service';
import { REMITENTE_EXTERNO } from '../registros/registro-vista';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
/** En Laravel la sede 16 ("N/A" en el catálogo) se muestra como "Virtual". */
const SEDE_VIRTUAL = 16;
/** Color que usaba Laravel cuando el evento no tiene sede. */
const COLOR_SIN_SEDE = '#c6c811';

export type TipoReporte = 'general' | 'comisiones';

interface FilaAgenda {
  id: number;
  title: string | null;
  registroId: number | null;
  registroPId: number | null;
  fecha: string;
  inicio: string | null;
  fin: string | null;
  sedeId: number | null;
  sede: string | null;
  color: string | null;
  folio: string | null;
  referencia: string | null;
  asunto: string | null;
  indicaciones: string | null;
  nombreEventoRegistro: string | null;
  remitenteRfc: string | null;
  otroRemitente: string | null;
  tipoAtencion: string | null;
  nombreEventoLegislativo: string | null;
  materia: string | null;
  tipoEvento: string | null;
  tipoReunion: string | null;
  modalidad: string | null;
  capturo: string | null;
}

/**
 * Agenda de Presidencia (tabla heredada `agenda_presidencia`). Cada evento viene de un documento
 * de la serie EVENTOS (`registro_id`) o de un evento legislativo capturado en Laravel
 * (`registroP_id` → `registro_presidencia`). `start`/`end` son TIMESTAMP en UTC: se leen en hora
 * de México (UTC-6).
 */
@Injectable()
export class AgendaPresidenciaService {
  constructor(
    @InjectModel(Registro) private readonly registroModel: typeof Registro,
    @InjectModel(ComisionLegislativo, 'legislativo')
    private readonly comisionModel: typeof ComisionLegislativo,
    private readonly padron: PadronService,
  ) {}

  async sedes() {
    const filas = await this.registroModel.sequelize!.query<{
      id: number;
      salon: string | null;
      color: string | null;
    }>('SELECT id, salon, color FROM salones ORDER BY salon', {
      type: QueryTypes.SELECT,
    });
    return filas.map((s) => ({
      id: s.id,
      nombre: s.id === SEDE_VIRTUAL ? 'Virtual' : (s.salon ?? ''),
      color: s.color,
    }));
  }

  /** Eventos del rango, para el calendario (solo lo que se ve, no el histórico completo). */
  async eventos(desde: string, hasta: string, sede?: number) {
    const filas = await this.consultar({ desde, hasta, sede });
    return filas.map((f) => ({
      id: f.id,
      registroId: f.registroId,
      origen: f.registroId ? ('documento' as const) : ('legislativo' as const),
      titulo: f.title ?? '',
      fecha: f.fecha,
      inicio: f.inicio,
      fin: f.fin,
      color: f.color ?? COLOR_SIN_SEDE,
      sede: this.nombreSede(f),
    }));
  }

  async detalle(id: number) {
    const [fila] = await this.consultar({ id });
    if (!fila) throw new NotFoundException('El evento no existe');
    const [vistas] = await this.aVistas([fila]);
    return vistas;
  }

  /** Datos de "Agenda general" y "Agenda comisiones", agrupados por día para imprimir. */
  async reporte(
    tipo: TipoReporte,
    desde: string,
    hasta: string | undefined,
    sede?: number,
  ) {
    const filas = await this.consultar({
      desde,
      hasta: hasta || desde,
      sede,
      soloLegislativos: tipo === 'comisiones',
    });
    const eventos = await this.aVistas(filas);
    const porDia = new Map<string, typeof eventos>();
    for (const e of eventos) {
      porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e]);
    }
    return {
      tipo,
      desde,
      hasta: hasta || desde,
      sede: sede
        ? ((await this.sedes()).find((s) => s.id === sede)?.nombre ?? null)
        : null,
      dias: [...porDia.entries()].map(([fecha, lista]) => ({
        fecha,
        eventos: lista,
      })),
    };
  }

  private nombreSede(f: FilaAgenda): string | null {
    return Number(f.sedeId) === SEDE_VIRTUAL ? 'Virtual' : f.sede;
  }

  private async aVistas(filas: FilaAgenda[]) {
    const legislativos = filas
      .filter((f) => !f.registroId && f.registroPId)
      .map((f) => f.registroPId!);
    const [nombres, comisiones] = await Promise.all([
      this.padron.nombresPorRfc(
        filas
          .flatMap((f) => [f.remitenteRfc ?? '', f.capturo ?? ''])
          .filter((r) => r && r !== REMITENTE_EXTERNO),
      ),
      this.comisionesDe(legislativos),
    ]);

    return filas.map((f) => {
      const comun = {
        id: f.id,
        fecha: f.fecha,
        horaInicio: f.inicio?.slice(11, 16) ?? null,
        horaTermino: f.fin?.slice(11, 16) ?? null,
        sede: this.nombreSede(f),
        color: f.color ?? COLOR_SIN_SEDE,
      };
      if (f.registroId) {
        return {
          ...comun,
          origen: 'documento' as const,
          registroId: f.registroId,
          titulo: f.title ?? f.folio ?? '',
          nombreEvento: f.nombreEventoRegistro,
          indicaciones: f.indicaciones,
          asunto: f.asunto,
          folio: f.folio,
          referencia: f.referencia,
          tipoAtencion: f.tipoAtencion,
          remitente:
            f.remitenteRfc === REMITENTE_EXTERNO
              ? f.otroRemitente
              : (nombres.get(f.remitenteRfc ?? '') ??
                f.otroRemitente ??
                f.remitenteRfc),
          tipoEvento: null,
          materia: null,
          tipoReunion: null,
          modalidad: null,
          comisiones: [] as string[],
          capturo: null,
        };
      }
      return {
        ...comun,
        origen: 'legislativo' as const,
        registroId: null,
        titulo: f.title ?? f.tipoEvento ?? '',
        nombreEvento: f.nombreEventoLegislativo,
        indicaciones: null,
        asunto: null,
        folio: null,
        referencia: null,
        tipoAtencion: null,
        remitente: null,
        tipoEvento: f.tipoEvento,
        materia: f.materia,
        tipoReunion: f.tipoReunion,
        modalidad: f.modalidad,
        comisiones: comisiones.get(f.registroPId!) ?? [],
        capturo: f.capturo ? (nombres.get(f.capturo) ?? f.capturo) : null,
      };
    });
  }

  /** Nombre de cada comisión (incluye las dadas de baja, para eventos viejos). */
  async nombresComisiones(ids: string[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter(Boolean))];
    if (unicos.length === 0) return new Map();
    const filas = await this.comisionModel.findAll({
      attributes: ['id', 'nombre'],
      where: { id: { [Op.in]: unicos } },
      paranoid: false,
    });
    return new Map(filas.map((c) => [c.id, c.nombre]));
  }

  /** Nombres de las comisiones de cada evento legislativo. */
  private async comisionesDe(ids: number[]): Promise<Map<number, string[]>> {
    const resultado = new Map<number, string[]>();
    if (ids.length === 0) return resultado;
    const filas = await this.registroModel.sequelize!.query<{
      idRegistroP: number;
      idComision: string;
    }>(
      'SELECT id_registroP AS idRegistroP, id_comision AS idComision FROM comision_registro ' +
        'WHERE STATUS = 1 AND id_registroP IN (:ids) ORDER BY id',
      { type: QueryTypes.SELECT, replacements: { ids } },
    );
    const nombres = await this.nombresComisiones(
      filas.map((f) => f.idComision),
    );
    for (const f of filas) {
      const nombre = nombres.get(f.idComision) ?? 'Comisión no encontrada';
      resultado.set(f.idRegistroP, [
        ...(resultado.get(f.idRegistroP) ?? []),
        nombre,
      ]);
    }
    return resultado;
  }

  private async consultar(filtro: {
    desde?: string;
    hasta?: string;
    sede?: number;
    id?: number;
    soloLegislativos?: boolean;
  }): Promise<FilaAgenda[]> {
    const condiciones = ['a.status = 1'];
    if (filtro.id) {
      condiciones.push('a.id = :id');
    } else {
      if (!FECHA.test(filtro.desde ?? '') || !FECHA.test(filtro.hasta ?? '')) {
        throw new BadRequestException(
          'Indica el rango de fechas como AAAA-MM-DD',
        );
      }
      if (filtro.desde! > filtro.hasta!) {
        throw new BadRequestException(
          'La fecha inicial no puede ser posterior a la final',
        );
      }
      condiciones.push('a.empieza BETWEEN :desde AND :hasta');
    }
    if (filtro.sede) condiciones.push('COALESCE(r.salon, rp.sede) = :sede');
    if (filtro.soloLegislativos)
      condiciones.push('a.registro_id IS NULL AND a.registroP_id IS NOT NULL');

    return this.registroModel.sequelize!.query<FilaAgenda>(
      `SELECT a.id, a.title, a.registro_id AS registroId, a.registroP_id AS registroPId,
         DATE_FORMAT(a.empieza, '%Y-%m-%d') AS fecha,
         DATE_FORMAT(CONVERT_TZ(a.start, '+00:00', '-06:00'), '%Y-%m-%d %H:%i:%s') AS inicio,
         DATE_FORMAT(CONVERT_TZ(a.end, '+00:00', '-06:00'), '%Y-%m-%d %H:%i:%s') AS fin,
         COALESCE(r.salon, rp.sede) AS sedeId,
         COALESCE(sr.salon, sp.salon) AS sede,
         COALESCE(sr.color, sp.color) AS color,
         r.folio, r.referencia_documento AS referencia, r.descripcion_doc AS asunto,
         r.titulo_doc AS indicaciones, r.nombre_evento AS nombreEventoRegistro,
         r.remitente_rfc AS remitenteRfc, r.otro_remitente AS otroRemitente, ta.tipo AS tipoAtencion,
         rp.nombre_evento AS nombreEventoLegislativo, rp.materia, te.tipo AS tipoEvento,
         tr.tipo AS tipoReunion, m.modalidad, rp.user_registro AS capturo
       FROM agenda_presidencia a
       LEFT JOIN registro r ON r.id = a.registro_id
       LEFT JOIN salones sr ON sr.id = r.salon
       LEFT JOIN tipo_atencions ta ON ta.id = r.tipo_atencion
       LEFT JOIN registro_presidencia rp ON rp.id = a.registroP_id AND a.registro_id IS NULL
       LEFT JOIN salones sp ON sp.id = rp.sede
       LEFT JOIN tipo_evento te ON te.id = rp.tipo_evento
       LEFT JOIN tipo_reunion tr ON tr.id = rp.tipo_reunion
       LEFT JOIN modalidad m ON m.id = rp.modalidad
       WHERE ${condiciones.join(' AND ')}
       ORDER BY a.empieza, a.start`,
      {
        type: QueryTypes.SELECT,
        replacements: {
          id: filtro.id ?? null,
          desde: filtro.desde ?? null,
          hasta: filtro.hasta ?? null,
          sede: filtro.sede ?? null,
        },
      },
    );
  }
}
