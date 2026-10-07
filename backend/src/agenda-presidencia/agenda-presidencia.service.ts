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

/** Serie de los documentos de eventos (la misma que alimenta la agenda). */
const SERIE_EVENTOS = 4161;
const MAX_DIAS_DETALLADA = 30;
/** Palacio Legislativo (recorridos), Evento foráneo y N/A no son salones del recinto. */
export const SEDE_PALACIO = 1;
const SEDE_FORANEA = 11;
const SEDES_FUERA_DEL_RECINTO = [SEDE_PALACIO, SEDE_FORANEA, SEDE_VIRTUAL];
const SEDE_COMEDOR = 13;

export type CategoriaEvento =
  'comision' | 'sesion' | 'evento' | 'visita' | 'comedor' | 'foraneo';

/**
 * Tipo con el que se pinta el evento en la agenda detallada. Los documentos de EVENTOS no traen
 * tipo: se deduce de la sede (Comedor, Evento foráneo) y del texto (visitas guiadas, recorridos).
 */
function categoriaEvento(e: {
  origen: 'documento' | 'legislativo';
  sedeId: number | null;
  tipoEvento: string | null;
  nombreEvento: string | null;
  asunto: string | null;
}): CategoriaEvento {
  if (e.sedeId === SEDE_FORANEA) return 'foraneo';
  if (e.origen === 'legislativo') {
    const tipo = (e.tipoEvento ?? '').toLowerCase();
    if (tipo.includes('comisi')) return 'comision';
    if (tipo.includes('sesi')) return 'sesion';
    return 'evento';
  }
  if (e.sedeId === SEDE_COMEDOR) return 'comedor';
  if (
    /visita guiada|recorrido/i.test(`${e.nombreEvento ?? ''} ${e.asunto ?? ''}`)
  ) {
    return 'visita';
  }
  return 'evento';
}

/** "2026-10-06" -> "2026-10-07". */
function diaSiguiente(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
}

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

  /**
   * "Agenda detallada": por día, la ocupación de cada salón (para la gráfica de 07:00 a 20:00) y
   * la lista de eventos, incluidos los documentos de la serie EVENTOS que se cancelaron (los
   * eventos legislativos cancelados se borran en el sistema, así que no aparecen).
   */
  async detallada(desde: string, hasta: string | undefined) {
    const fin = hasta || desde;
    if (FECHA.test(desde) && FECHA.test(fin)) {
      const dias = (Date.parse(fin) - Date.parse(desde)) / 86_400_000;
      if (dias > MAX_DIAS_DETALLADA) {
        throw new BadRequestException(
          `La agenda detallada abarca como máximo ${MAX_DIAS_DETALLADA + 1} días.`,
        );
      }
    }
    const filas = await this.consultar({ desde, hasta: fin });
    const activos = (await this.aVistas(filas)).map((e) => ({
      id: e.id,
      fecha: e.fecha,
      horaInicio: e.horaInicio,
      horaTermino: e.horaTermino,
      sedeId: e.sedeId,
      sede: e.sede,
      categoria: categoriaEvento(e),
      titulo:
        e.origen === 'documento'
          ? e.nombreEvento || e.asunto || e.titulo
          : e.nombreEvento || e.materia || e.tipoEvento || e.titulo,
      detalle:
        e.origen === 'documento'
          ? e.nombreEvento
            ? e.asunto
            : null
          : e.tipoReunion,
      solicitante:
        e.origen === 'documento'
          ? e.remitente
          : e.comisiones.length > 1
            ? 'Comisiones unidas'
            : e.comisiones[0] || e.capturo,
      cancelado: false,
      canceladoEl: null as string | null,
      registroPId: e.registroPId,
      /** Día al que se movió (solo en el día original de un evento reprogramado). */
      reprogramadoA: null as string | null,
      /** Día en que estaba antes de su última reprogramación. */
      reprogramadoDe: null as string | null,
    }));

    const cancelados = await this.registroModel.sequelize!.query<{
      id: number;
      fecha: string;
      inicio: string | null;
      fin: string | null;
      sedeId: number | null;
      sede: string | null;
      nombreEvento: string | null;
      asunto: string | null;
      remitenteRfc: string | null;
      otroRemitente: string | null;
      canceladoEl: string;
    }>(
      `SELECT r.id, DATE_FORMAT(r.fecha_limite_atencion, '%Y-%m-%d') AS fecha,
         TIME_FORMAT(r.hora_atencion, '%H:%i') AS inicio, TIME_FORMAT(r.hora_termino, '%H:%i') AS fin,
         r.salon AS sedeId, s.salon AS sede, r.nombre_evento AS nombreEvento,
         r.descripcion_doc AS asunto, r.remitente_rfc AS remitenteRfc, r.otro_remitente AS otroRemitente,
         DATE_FORMAT(CONVERT_TZ(r.updated_at, '+00:00', '-06:00'), '%Y-%m-%d %H:%i') AS canceladoEl
       FROM registro r
       LEFT JOIN salones s ON s.id = r.salon
       WHERE r.serie_id = :serie AND r.activo = 0
         AND r.fecha_limite_atencion BETWEEN :desde AND :hasta`,
      {
        type: QueryTypes.SELECT,
        replacements: { serie: SERIE_EVENTOS, desde, hasta: fin },
      },
    );
    const nombres = await this.padron.nombresPorRfc(
      cancelados
        .map((c) => c.remitenteRfc ?? '')
        .filter((r) => r && r !== REMITENTE_EXTERNO),
    );
    const eventosCancelados = cancelados.map((c) => ({
      id: -Number(c.id),
      fecha: c.fecha,
      horaInicio: c.inicio && c.inicio !== '00:00' ? c.inicio : null,
      horaTermino: c.fin && c.fin !== '00:00' ? c.fin : null,
      sedeId: c.sedeId ? Number(c.sedeId) : null,
      sede: c.sedeId && Number(c.sedeId) === SEDE_VIRTUAL ? 'Virtual' : c.sede,
      categoria: 'evento',
      titulo: c.nombreEvento || c.asunto || '',
      detalle: c.nombreEvento ? c.asunto : null,
      solicitante:
        c.remitenteRfc === REMITENTE_EXTERNO
          ? c.otroRemitente
          : (nombres.get(c.remitenteRfc ?? '') ??
            c.otroRemitente ??
            c.remitenteRfc),
      cancelado: true,
      canceladoEl: c.canceladoEl,
      registroPId: null as number | null,
      reprogramadoA: null as string | null,
      reprogramadoDe: null as string | null,
    }));

    const reprogramados = await this.reprogramadosEn(desde, fin, activos);
    const todos = [...activos, ...eventosCancelados, ...reprogramados];
    const fechas: string[] = [];
    for (let d = desde; d <= fin; d = diaSiguiente(d)) fechas.push(d);
    return {
      desde,
      hasta: fin,
      salones: (await this.sedes()).filter(
        (s) => !SEDES_FUERA_DEL_RECINTO.includes(s.id),
      ),
      dias: fechas.map((fecha) => ({
        fecha,
        eventos: todos
          .filter((e) => e.fecha === fecha)
          .sort((a, b) =>
            (a.horaInicio ?? '99').localeCompare(b.horaInicio ?? '99'),
          ),
      })),
    };
  }

  /**
   * Para la agenda detallada: los eventos legislativos que estaban en el periodo y se
   * reprogramaron (aparecen en su día original, sin ocupar la sede), y la fecha anterior de los
   * que hoy están en el periodo tras una reprogramación.
   */
  private async reprogramadosEn(
    desde: string,
    hasta: string,
    activos: {
      fecha: string;
      registroPId: number | null;
      reprogramadoDe: string | null;
    }[],
  ) {
    const db = this.registroModel.sequelize!;
    const idsActivos = [
      ...new Set(
        activos.map((a) => a.registroPId).filter((x): x is number => !!x),
      ),
    ];
    if (idsActivos.length) {
      const ultimas = await db.query<{ id: number; fechaAnterior: string }>(
        `SELECT er.registroP_id AS id, DATE_FORMAT(er.fecha_anterior, '%Y-%m-%d') AS fechaAnterior
           FROM eventos_reprogramaciones er
           JOIN (SELECT registroP_id, MAX(id) AS ultimo FROM eventos_reprogramaciones
                  WHERE registroP_id IN (:ids) GROUP BY registroP_id) u ON u.ultimo = er.id`,
        { type: QueryTypes.SELECT, replacements: { ids: idsActivos } },
      );
      const porEvento = new Map(
        ultimas.map((u) => [Number(u.id), u.fechaAnterior]),
      );
      for (const a of activos) {
        if (a.registroPId)
          a.reprogramadoDe = porEvento.get(a.registroPId) ?? null;
      }
    }

    const filas = await db.query<{
      id: number;
      registroPId: number;
      desde: string;
      hasta: string;
      inicio: string | null;
      fin: string | null;
      sedeId: number | null;
      sede: string | null;
      fechaNueva: string;
      motivo: string;
      nombreEvento: string | null;
      materia: string | null;
      tipoEvento: string | null;
    }>(
      `SELECT er.id, er.registroP_id AS registroPId,
          DATE_FORMAT(er.fecha_anterior, '%Y-%m-%d') AS desde,
          DATE_FORMAT(COALESCE(er.fecha_fin_anterior, er.fecha_anterior), '%Y-%m-%d') AS hasta,
          TIME_FORMAT(er.hora_inicio_anterior, '%H:%i') AS inicio,
          TIME_FORMAT(er.hora_termino_anterior, '%H:%i') AS fin,
          er.sede_anterior AS sedeId, s.salon AS sede,
          DATE_FORMAT(er.fecha_nueva, '%Y-%m-%d') AS fechaNueva, er.motivo,
          rp.nombre_evento AS nombreEvento, rp.materia, te.tipo AS tipoEvento
        FROM eventos_reprogramaciones er
        JOIN registro_presidencia rp ON rp.id = er.registroP_id
        LEFT JOIN tipo_evento te ON te.id = rp.tipo_evento
        LEFT JOIN salones s ON s.id = er.sede_anterior
        WHERE er.fecha_anterior <= :hasta
          AND COALESCE(er.fecha_fin_anterior, er.fecha_anterior) >= :desde`,
      { type: QueryTypes.SELECT, replacements: { desde, hasta } },
    );
    if (filas.length === 0) return [];
    const comisiones = await this.comisionesDe(
      filas.map((f) => Number(f.registroPId)),
    );
    const activoEl = new Set(activos.map((a) => `${a.registroPId}|${a.fecha}`));

    return filas.flatMap((f) => {
      const sedeId = f.sedeId ? Number(f.sedeId) : null;
      const lista = comisiones.get(Number(f.registroPId)) ?? [];
      const dias: string[] = [];
      for (
        let d = f.desde < desde ? desde : f.desde;
        d <= f.hasta && d <= hasta;
        d = diaSiguiente(d)
      ) {
        dias.push(d);
      }
      return (
        dias
          // Si después volvió a quedar ese mismo día, no se marca como reprogramado.
          .filter((dia) => !activoEl.has(`${f.registroPId}|${dia}`))
          .map((dia, i) => ({
            id: -(1_000_000 + Number(f.id) * 100 + i),
            fecha: dia,
            horaInicio: f.inicio,
            horaTermino: f.fin,
            sedeId,
            sede: sedeId === SEDE_VIRTUAL ? 'Virtual' : f.sede,
            categoria: categoriaEvento({
              origen: 'legislativo',
              sedeId,
              tipoEvento: f.tipoEvento,
              nombreEvento: f.nombreEvento,
              asunto: null,
            }),
            titulo: f.nombreEvento || f.materia || f.tipoEvento || 'Evento',
            detalle: f.motivo,
            solicitante:
              lista.length > 1 ? 'Comisiones unidas' : (lista[0] ?? null),
            cancelado: false,
            canceladoEl: null as string | null,
            registroPId: Number(f.registroPId),
            reprogramadoA: f.fechaNueva,
            reprogramadoDe: null as string | null,
          }))
      );
    });
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
        sedeId: f.sedeId ? Number(f.sedeId) : null,
        sede: this.nombreSede(f),
        color: f.color ?? COLOR_SIN_SEDE,
      };
      if (f.registroId) {
        return {
          ...comun,
          origen: 'documento' as const,
          registroId: f.registroId,
          registroPId: null as number | null,
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
        registroPId: f.registroPId,
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
