import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Registro } from '../database/models/registro.model';
import { fechaHoyMexico } from '../common/fecha-mexico.util';

interface FilaAgenda {
  empieza: string;
  termina: string | null;
  inicio: string | null;
  fin: string | null;
  titulo: string | null;
  descripcion: string | null;
  esLegislativo: number;
  sedeId: number | null;
  sede: string | null;
  evento: string | null;
  materia: string | null;
  modalidad: string | null;
  tipoReunion: string | null;
  folio: string | null;
  referencia: string | null;
}

/** Un evento del día, con las mismas llaves que devolvía Laravel. */
export interface EventoApi {
  fecha_termino: string | null;
  hora_inicio: string | null;
  hora_termino: string | null;
  sede: string | null;
  titulo: string | null;
  descripcion: string | null;
  evento: string | null;
  materia: string | null;
  modalidad: string | null;
  tipo_reunion: string | null;
  folio: string | null;
  referencia: string | null;
}

/** Ocupación de una sede. "hora termino" (con espacio) es como lo devolvía Laravel. */
export interface OcupacionApi {
  salon: number | null;
  fecha_inicio: string;
  fecha_termino: string | null;
  hora_inicio: string | null;
  'hora termino': string | null;
}

const MES = /^\d{4}-\d{2}$/;

/**
 * API pública de la agenda de Presidencia que otros sistemas consultaban en Laravel
 * (GET /Documentacion/api/agenda, ApiController@index). Devuelve el mismo JSON:
 * `{ success, agenda: { "YYYY-MM-DD": [eventos] }, sedes: [{ id, salon, color, agenda }] }`.
 */
@Injectable()
export class ApiPublicaService {
  constructor(
    @InjectModel(Registro) private readonly registroModel: typeof Registro,
  ) {}

  /** `mes` (YYYY-MM) es opcional; como en Laravel, por defecto el mes en curso. */
  async agenda(mes?: string) {
    if (mes && !MES.test(mes)) {
      throw new BadRequestException('El mes debe tener el formato AAAA-MM.');
    }
    const periodo = mes || fechaHoyMexico().slice(0, 7);
    const db = this.registroModel.sequelize!;

    // start/end se guardan en UTC; Laravel los entregaba en hora de México.
    const filas = await db.query<FilaAgenda>(
      `SELECT DATE_FORMAT(a.empieza, '%Y-%m-%d') AS empieza,
         DATE_FORMAT(a.termina, '%Y-%m-%d') AS termina,
         DATE_FORMAT(CONVERT_TZ(a.start, '+00:00', '-06:00'), '%Y-%m-%d %H:%i:%s') AS inicio,
         DATE_FORMAT(CONVERT_TZ(a.end, '+00:00', '-06:00'), '%Y-%m-%d %H:%i:%s') AS fin,
         a.title AS titulo, a.descipcion AS descripcion,
         IF(rp.id IS NOT NULL, 1, 0) AS esLegislativo,
         IF(rp.id IS NOT NULL, rp.sede, r.salon) AS sedeId,
         IF(rp.id IS NOT NULL, sp.salon, sr.salon) AS sede,
         rp.nombre_evento AS evento, rp.materia, m.modalidad, tr.tipo AS tipoReunion,
         IF(rp.id IS NOT NULL, NULL, r.folio) AS folio,
         IF(rp.id IS NOT NULL, NULL, r.referencia_documento) AS referencia
       FROM agenda_presidencia a
       LEFT JOIN registro_presidencia rp ON rp.id = a.registroP_id
       LEFT JOIN salones sp ON sp.id = rp.sede
       LEFT JOIN modalidad m ON m.id = rp.modalidad
       LEFT JOIN tipo_reunion tr ON tr.id = rp.tipo_reunion
       LEFT JOIN registro r ON r.id = a.registro_id
       LEFT JOIN salones sr ON sr.id = r.salon
       WHERE a.status = 1 AND a.empieza LIKE :mes
         AND (rp.id IS NOT NULL OR r.id IS NOT NULL)
       ORDER BY a.empieza ASC, a.start ASC, a.id ASC`,
      { type: QueryTypes.SELECT, replacements: { mes: `${periodo}-%` } },
    );

    const agenda: Record<string, EventoApi[]> = {};
    const ocupacion: OcupacionApi[] = [];
    for (const f of filas) {
      const legislativo = Number(f.esLegislativo) === 1;
      (agenda[f.empieza] ??= []).push({
        fecha_termino: f.termina,
        hora_inicio: f.inicio,
        hora_termino: f.fin,
        sede: f.sede,
        titulo: f.titulo,
        descripcion: f.descripcion,
        evento: legislativo ? f.evento : null,
        materia: legislativo ? f.materia : null,
        modalidad: legislativo ? f.modalidad : null,
        tipo_reunion: legislativo ? f.tipoReunion : null,
        folio: f.folio,
        referencia: f.referencia,
      });
      ocupacion.push({
        salon: f.sedeId != null ? Number(f.sedeId) : null,
        fecha_inicio: f.empieza,
        fecha_termino: f.termina,
        hora_inicio: f.inicio,
        'hora termino': f.fin,
      });
    }

    const salones = await db.query<{
      id: number;
      salon: string | null;
      color: string | null;
    }>('SELECT id, salon, color FROM salones ORDER BY id', {
      type: QueryTypes.SELECT,
    });
    const sedes = salones.map((s) => ({
      id: Number(s.id),
      salon: s.salon,
      color: s.color,
      agenda: ocupacion.filter((o) => o.salon === Number(s.id)),
    }));

    return { success: true, agenda, sedes };
  }
}
