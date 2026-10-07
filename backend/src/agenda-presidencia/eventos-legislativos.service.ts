import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, QueryTypes, Transaction } from 'sequelize';
import {
  ComisionRegistro,
  RegistroPresidencia,
  TIPO_EVENTO_COMISION,
  TIPO_EVENTO_COMPARECENCIA,
  TIPO_EVENTO_OTRO,
} from '../database/models/registro-presidencia.model';
import {
  Modalidad,
  TipoEvento,
  TipoReunion,
} from '../database/models/catalogos-simples.model';
import { ComisionLegislativo } from '../database/models/comision-legislativo.model';
import { PadronService } from '../common/padron.service';
import { UsuarioActual } from '../common/usuario-actual';
import { fechaHoyMexico } from '../common/fecha-mexico.util';
import { caracteresNoLatin1 } from '../common/latin1.util';
import { AgendaPresidenciaService } from './agenda-presidencia.service';
import {
  EventoLegislativoDto,
  ReprogramarEventoDto,
} from './dto/evento-legislativo.dto';
import { EventoReprogramacion } from '../database/models/evento-reprogramacion.model';

function hora(valor: string): string {
  return valor.length === 5 ? `${valor}:00` : valor.slice(0, 8);
}

/** Un evento puede repetirse, como máximo, este número de días. */
const MAX_DIAS_EVENTO = 31;

/** Días de `desde` a `hasta` (YYYY-MM-DD), ambos incluidos. */
export function diasDelRango(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  const [a, m, d] = desde.split('-').map(Number);
  for (let i = 0; i <= 366; i++) {
    const dia = new Date(Date.UTC(a, m - 1, d + i)).toISOString().slice(0, 10);
    if (dia > hasta) break;
    dias.push(dia);
  }
  return dias;
}

/** "2026-10-06" -> "06/10". */
function diaCorto(fecha: string): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}

/**
 * Captura de eventos legislativos de Presidencia (en Laravel: RegistroPresidencia). Cada evento
 * vive en `registro_presidencia`, sus comisiones en `comision_registro` y su entrada de agenda en
 * `agenda_presidencia`. Laravel además lo copiaba a la base del Pleno, que ya no se usa.
 */
@Injectable()
export class EventosLegislativosService {
  constructor(
    @InjectModel(RegistroPresidencia)
    private readonly eventoModel: typeof RegistroPresidencia,
    @InjectModel(ComisionRegistro)
    private readonly comisionRegistroModel: typeof ComisionRegistro,
    @InjectModel(EventoReprogramacion)
    private readonly reprogramacionModel: typeof EventoReprogramacion,
    @InjectModel(TipoEvento)
    private readonly tipoEventoModel: typeof TipoEvento,
    @InjectModel(TipoReunion)
    private readonly tipoReunionModel: typeof TipoReunion,
    @InjectModel(Modalidad) private readonly modalidadModel: typeof Modalidad,
    @InjectModel(ComisionLegislativo, 'legislativo')
    private readonly comisionModel: typeof ComisionLegislativo,
    private readonly padron: PadronService,
    private readonly agenda: AgendaPresidenciaService,
  ) {}

  async catalogos() {
    const [tiposEvento, tiposReunion, modalidades, comisiones, sedes] =
      await Promise.all([
        this.tipoEventoModel.findAll({ order: [['id', 'ASC']] }),
        this.tipoReunionModel.findAll({ order: [['id', 'ASC']] }),
        this.modalidadModel.findAll({ order: [['id', 'ASC']] }),
        // Como en Laravel (SoftDeletes): solo las comisiones vigentes.
        this.comisionModel.findAll({ order: [['nombre', 'ASC']] }),
        this.agenda.sedes(),
      ]);
    return {
      tiposEvento: tiposEvento.map((t) => ({ id: t.id, nombre: t.tipo ?? '' })),
      tiposReunion: tiposReunion.map((t) => ({
        id: t.id,
        nombre: t.tipo ?? '',
      })),
      modalidades: modalidades.map((m) => ({
        id: m.id,
        nombre: m.modalidad ?? '',
      })),
      comisiones: comisiones.map((c) => ({ id: c.id, nombre: c.nombre })),
      sedes,
    };
  }

  async listar(anio: number) {
    const eventos = await this.eventoModel.findAll({
      where: {
        fechaEvento: { [Op.between]: [`${anio}-01-01`, `${anio}-12-31`] },
      },
      include: [{ model: ComisionRegistro, as: 'comisiones' }],
      order: [
        ['fechaEvento', 'DESC'],
        ['horaInicio', 'ASC'],
      ],
    });
    return this.aVistas(eventos);
  }

  async obtener(id: number) {
    const evento = await this.eventoModel.findByPk(id, {
      include: [{ model: ComisionRegistro, as: 'comisiones' }],
    });
    if (!evento) throw new NotFoundException('El evento no existe');
    const [vista] = await this.aVistas([evento]);
    return vista;
  }

  /**
   * ¿La sede está libre en ese horario todos los días de `fecha` a `hasta`? Revisa, como Laravel,
   * otros eventos legislativos (también los de varios días) y los documentos activos con sede
   * (serie EVENTOS) que se traslapen. En un rango, cada conflicto indica el día.
   */
  async disponibilidad(
    fecha: string,
    inicio: string,
    termino: string,
    sede: number,
    excluirId?: number,
    hasta?: string | null,
  ) {
    const fin = hasta && hasta > fecha ? hasta : fecha;
    const replacements = {
      desde: fecha,
      hasta: fin,
      inicio: hora(inicio),
      termino: hora(termino),
      sede,
      excluir: excluirId ?? 0,
    };
    const conflictos = await this.eventoModel.sequelize!.query<{
      descripcion: string;
      desde: string;
      hasta: string;
      horaInicio: string;
      horaTermino: string;
    }>(
      `SELECT COALESCE(rp.nombre_evento, te.tipo) AS descripcion,
          DATE_FORMAT(GREATEST(rp.fecha_evento, :desde), '%Y-%m-%d') AS desde,
          DATE_FORMAT(LEAST(COALESCE(rp.fecha_fin, rp.fecha_evento), :hasta), '%Y-%m-%d') AS hasta,
          rp.hora_inicio AS horaInicio, rp.hora_termino AS horaTermino
        FROM registro_presidencia rp
        LEFT JOIN tipo_evento te ON te.id = rp.tipo_evento
        WHERE rp.STATUS = 1 AND rp.sede = :sede AND rp.id <> :excluir
          AND rp.fecha_evento <= :hasta AND COALESCE(rp.fecha_fin, rp.fecha_evento) >= :desde
          AND rp.hora_inicio < :termino AND rp.hora_termino > :inicio
       UNION ALL
       SELECT CONCAT(r.folio, ' ', COALESCE(r.nombre_evento, '')) AS descripcion,
          DATE_FORMAT(r.fecha_limite_atencion, '%Y-%m-%d') AS desde,
          DATE_FORMAT(r.fecha_limite_atencion, '%Y-%m-%d') AS hasta,
          r.hora_atencion AS horaInicio, r.hora_termino AS horaTermino
        FROM registro r
        WHERE r.activo = 1 AND r.fecha_limite_atencion BETWEEN :desde AND :hasta AND r.salon = :sede
          AND r.hora_atencion < :termino AND r.hora_termino > :inicio
       ORDER BY desde, horaInicio`,
      { type: QueryTypes.SELECT, replacements },
    );
    const dias = (c: { desde: string; hasta: string }) =>
      fin === fecha
        ? ''
        : c.desde === c.hasta
          ? `${diaCorto(c.desde)} `
          : `${diaCorto(c.desde)} al ${diaCorto(c.hasta)} `;
    return {
      disponible: conflictos.length === 0,
      conflictos: conflictos.map((c) => ({
        descripcion: c.descripcion.trim(),
        horario: `${dias(c)}${c.horaInicio?.slice(0, 5)}–${c.horaTermino?.slice(0, 5)}`,
      })),
    };
  }

  async crear(dto: EventoLegislativoDto, usuario: UsuarioActual) {
    const datos = await this.validar(dto);
    if (datos.fechaEvento < fechaHoyMexico()) {
      throw new BadRequestException(
        'No se pueden agendar eventos con fecha pasada.',
      );
    }
    await this.exigirSedeLibre(dto);

    const evento = await this.eventoModel.sequelize!.transaction(
      async (transaction) => {
        const { comisiones, ...campos } = datos;
        const nuevo = await this.eventoModel.create(
          { ...campos, userRegistro: usuario.rfc, status: 1 },
          { transaction },
        );
        await this.guardarComisiones(nuevo.id, comisiones, transaction);
        await this.sincronizarAgenda(nuevo, transaction);
        return nuevo;
      },
    );
    return { id: evento.id };
  }

  async editar(id: number, dto: EventoLegislativoDto) {
    const evento = await this.eventoModel.findByPk(id);
    if (!evento) throw new NotFoundException('El evento no existe');
    const datos = await this.validar(dto);
    if (
      datos.fechaEvento !== evento.fechaEvento &&
      datos.fechaEvento < fechaHoyMexico()
    ) {
      throw new BadRequestException(
        'No se pueden agendar eventos con fecha pasada.',
      );
    }
    await this.exigirSedeLibre(dto, id);

    await this.eventoModel.sequelize!.transaction(async (transaction) => {
      const { comisiones, ...campos } = datos;
      await evento.update(campos, { transaction });
      await this.comisionRegistroModel.destroy({
        where: { idRegistroP: id },
        transaction,
      });
      await this.guardarComisiones(id, comisiones, transaction);
      await this.sincronizarAgenda(evento, transaction);
    });
  }

  /**
   * Cambia la fecha (y, si se indica, horario y sede) de un evento y deja constancia en el
   * historial: la agenda del día original indicará a qué fecha pasó.
   */
  async reprogramar(
    id: number,
    dto: ReprogramarEventoDto,
    usuario: UsuarioActual,
  ) {
    const evento = await this.eventoModel.findByPk(id);
    if (!evento) throw new NotFoundException('El evento no existe');

    const fechaEvento = dto.fechaEvento.slice(0, 10);
    // Si el evento era de varios días y no se indica nueva fecha final, conserva su duración.
    const duracion = evento.fechaFin
      ? diasDelRango(evento.fechaEvento, evento.fechaFin).length - 1
      : 0;
    const fechaFinPedida =
      dto.fechaFin === undefined
        ? duracion
          ? diasDelRango(fechaEvento, '9999-12-31')[duracion]
          : null
        : dto.fechaFin?.slice(0, 10) || null;
    const fechaFin =
      fechaFinPedida && fechaFinPedida !== fechaEvento ? fechaFinPedida : null;
    const horaInicio = dto.horaInicio
      ? hora(dto.horaInicio)
      : evento.horaInicio;
    const horaTermino = dto.horaTermino
      ? hora(dto.horaTermino)
      : evento.horaTermino;
    const sede = dto.sede ?? evento.sede;
    const motivo = dto.motivo.trim();

    if (fechaEvento < fechaHoyMexico()) {
      throw new BadRequestException(
        'La nueva fecha no puede ser anterior a hoy.',
      );
    }
    if (fechaFin && fechaFin < fechaEvento) {
      throw new BadRequestException(
        'La fecha final no puede ser anterior a la nueva fecha.',
      );
    }
    if (
      fechaFin &&
      diasDelRango(fechaEvento, fechaFin).length > MAX_DIAS_EVENTO
    ) {
      throw new BadRequestException(
        `Un evento puede repetirse como máximo ${MAX_DIAS_EVENTO} días.`,
      );
    }
    if (horaTermino <= horaInicio) {
      throw new BadRequestException(
        'La hora de término debe ser posterior a la de inicio.',
      );
    }
    if (
      fechaEvento === evento.fechaEvento &&
      (fechaFin ?? null) === (evento.fechaFin ?? null) &&
      horaInicio === evento.horaInicio &&
      horaTermino === evento.horaTermino &&
      sede === evento.sede
    ) {
      throw new BadRequestException(
        'La reprogramación debe cambiar la fecha, el horario o la sede.',
      );
    }
    const noPermitidos = caracteresNoLatin1(motivo);
    if (noPermitidos.length) {
      throw new BadRequestException(
        `El motivo tiene caracteres que no se pueden guardar: ${noPermitidos.join(' ')}`,
      );
    }

    const { disponible, conflictos } = await this.disponibilidad(
      fechaEvento,
      horaInicio,
      horaTermino,
      sede,
      id,
      fechaFin,
    );
    if (!disponible) {
      throw new ConflictException(
        `La sede no está disponible en la nueva fecha (${conflictos
          .map((c) => `${c.horario} ${c.descripcion}`)
          .join('; ')}).`,
      );
    }

    await this.eventoModel.sequelize!.transaction(async (transaction) => {
      await this.reprogramacionModel.create(
        {
          registroPId: id,
          fechaAnterior: evento.fechaEvento,
          fechaFinAnterior: evento.fechaFin,
          horaInicioAnterior: evento.horaInicio,
          horaTerminoAnterior: evento.horaTermino,
          sedeAnterior: evento.sede,
          fechaNueva: fechaEvento,
          motivo,
          userRfc: usuario.rfc,
        },
        { transaction },
      );
      await evento.update(
        { fechaEvento, fechaFin, horaInicio, horaTermino, sede },
        { transaction },
      );
      await this.sincronizarAgenda(evento, transaction);
    });
    return this.obtener(id);
  }

  async eliminar(id: number) {
    const evento = await this.eventoModel.findByPk(id);
    if (!evento) throw new NotFoundException('El evento no existe');
    await this.eventoModel.sequelize!.transaction(async (transaction) => {
      await this.eventoModel.sequelize!.query(
        'DELETE FROM agenda_presidencia WHERE registroP_id = :id AND registro_id IS NULL',
        { replacements: { id }, transaction },
      );
      await this.comisionRegistroModel.destroy({
        where: { idRegistroP: id },
        transaction,
      });
      await this.reprogramacionModel.destroy({
        where: { registroPId: id },
        transaction,
      });
      await evento.destroy({ transaction });
    });
  }

  /** Reglas del formulario de Laravel según el tipo de evento. */
  private async validar(dto: EventoLegislativoDto) {
    const tipo = await this.tipoEventoModel.findByPk(dto.tipoEvento);
    if (!tipo) throw new BadRequestException('El tipo de evento no existe');
    if (hora(dto.horaTermino) <= hora(dto.horaInicio)) {
      throw new BadRequestException(
        'La hora de término debe ser posterior a la de inicio.',
      );
    }

    const fechaEvento = dto.fechaEvento.slice(0, 10);
    const fechaFin =
      dto.fechaFin && dto.fechaFin.slice(0, 10) !== fechaEvento
        ? dto.fechaFin.slice(0, 10)
        : null;
    if (fechaFin && fechaFin < fechaEvento) {
      throw new BadRequestException(
        'La fecha final no puede ser anterior a la fecha del evento.',
      );
    }
    if (
      fechaFin &&
      diasDelRango(fechaEvento, fechaFin).length > MAX_DIAS_EVENTO
    ) {
      throw new BadRequestException(
        `Un evento puede repetirse como máximo ${MAX_DIAS_EVENTO} días.`,
      );
    }

    const esComision = dto.tipoEvento === TIPO_EVENTO_COMISION;
    const llevaMateria =
      esComision ||
      dto.tipoEvento === TIPO_EVENTO_COMPARECENCIA ||
      dto.tipoEvento === TIPO_EVENTO_OTRO;
    const comisiones = esComision ? [...new Set(dto.comisiones ?? [])] : [];

    if (esComision) {
      if (comisiones.length === 0) {
        throw new BadRequestException('Selecciona al menos una comisión.');
      }
      if (!dto.tipoReunion)
        throw new BadRequestException('Selecciona el tipo de reunión.');
      const existentes = await this.comisionModel.count({
        where: { id: { [Op.in]: comisiones } },
      });
      if (existentes !== comisiones.length) {
        throw new BadRequestException(
          'Alguna de las comisiones no existe o ya no está vigente.',
        );
      }
    }
    const noPermitidos = caracteresNoLatin1(
      `${dto.nombreEvento}${dto.materia ?? ''}`,
    );
    if (noPermitidos.length) {
      throw new BadRequestException(
        `El texto tiene caracteres que no se pueden guardar: ${noPermitidos.join(' ')}`,
      );
    }
    if (
      (esComision || dto.tipoEvento === TIPO_EVENTO_COMPARECENCIA) &&
      !dto.materia?.trim()
    ) {
      throw new BadRequestException('Captura la materia del evento.');
    }

    return {
      fechaEvento,
      fechaFin,
      horaInicio: hora(dto.horaInicio),
      horaTermino: hora(dto.horaTermino),
      tipoEvento: dto.tipoEvento,
      sede: dto.sede,
      modalidad: dto.modalidad,
      tipoReunion: esComision ? (dto.tipoReunion ?? null) : null,
      nombreEvento: dto.nombreEvento.trim(),
      materia: llevaMateria ? dto.materia?.trim() || null : null,
      comisiones,
    };
  }

  private async exigirSedeLibre(dto: EventoLegislativoDto, excluirId?: number) {
    const { disponible, conflictos } = await this.disponibilidad(
      dto.fechaEvento.slice(0, 10),
      dto.horaInicio,
      dto.horaTermino,
      dto.sede,
      excluirId,
      dto.fechaFin?.slice(0, 10) ?? null,
    );
    if (!disponible) {
      const detalle = conflictos
        .map((c) => `${c.horario} ${c.descripcion}`)
        .join('; ');
      throw new ConflictException(
        `La sede no está disponible: ya hay un evento agendado en ese horario (${detalle}).`,
      );
    }
  }

  private async guardarComisiones(
    idRegistroP: number,
    comisiones: string[],
    transaction: Transaction,
  ) {
    if (comisiones.length === 0) return;
    await this.comisionRegistroModel.bulkCreate(
      comisiones.map((idComision) => ({ idRegistroP, idComision, status: 1 })),
      { transaction },
    );
  }

  /** Entradas de agenda del evento; `start`/`end` en UTC (la hora capturada es de México). */
  private async sincronizarAgenda(
    evento: RegistroPresidencia,
    transaction: Transaction,
  ) {
    const tipo = await this.tipoEventoModel.findByPk(evento.tipoEvento, {
      transaction,
    });
    await this.eventoModel.sequelize!.query(
      'DELETE FROM agenda_presidencia WHERE registroP_id = :id AND registro_id IS NULL',
      { replacements: { id: evento.id }, transaction },
    );
    // Un evento de varios días aparece en la agenda cada día del rango, con el mismo horario.
    for (const fecha of diasDelRango(
      evento.fechaEvento,
      evento.fechaFin ?? evento.fechaEvento,
    )) {
      await this.eventoModel.sequelize!.query(
        'INSERT INTO agenda_presidencia ' +
          '(registroP_id, title, `start`, `end`, empieza, termina, status, created_at, updated_at) ' +
          "VALUES (:id, :titulo, CONVERT_TZ(:inicio, '-06:00', '+00:00'), " +
          "CONVERT_TZ(:fin, '-06:00', '+00:00'), :fecha, :fecha, 1, NOW(), NOW())",
        {
          replacements: {
            id: evento.id,
            titulo: tipo?.tipo ?? 'Evento',
            inicio: `${fecha} ${evento.horaInicio}`,
            fin: `${fecha} ${evento.horaTermino}`,
            fecha,
          },
          transaction,
        },
      );
    }
  }

  private async aVistas(eventos: RegistroPresidencia[]) {
    const idsComisiones = eventos.flatMap((e) =>
      (e.comisiones ?? []).map((c) => c.idComision),
    );
    const historial = eventos.length
      ? await this.reprogramacionModel.findAll({
          where: { registroPId: eventos.map((e) => e.id) },
          order: [['createdAt', 'DESC']],
        })
      : [];
    const [tipos, reuniones, modalidades, sedes, nombresComision, capturistas] =
      await Promise.all([
        this.tipoEventoModel.findAll(),
        this.tipoReunionModel.findAll(),
        this.modalidadModel.findAll(),
        this.agenda.sedes(),
        this.agenda.nombresComisiones(idsComisiones),
        this.padron.nombresPorRfc([
          ...eventos.map((e) => e.userRegistro ?? ''),
          ...historial.map((h) => h.userRfc ?? ''),
        ]),
      ]);
    const nombre = <T extends { id: number }>(
      lista: T[],
      id: number | null,
      campo: keyof T,
    ) =>
      id == null
        ? null
        : ((lista.find((x) => x.id === id)?.[campo] as string | null) ?? null);

    return eventos.map((e) => ({
      id: e.id,
      fechaEvento: e.fechaEvento,
      fechaFin: e.fechaFin,
      horaInicio: e.horaInicio?.slice(0, 5) ?? null,
      horaTermino: e.horaTermino?.slice(0, 5) ?? null,
      tipoEvento: {
        id: e.tipoEvento,
        nombre: nombre(tipos, e.tipoEvento, 'tipo'),
      },
      sede: {
        id: e.sede,
        nombre: sedes.find((s) => s.id === e.sede)?.nombre ?? null,
      },
      modalidad: {
        id: e.modalidad,
        nombre: nombre(modalidades, e.modalidad, 'modalidad'),
      },
      tipoReunion: {
        id: e.tipoReunion,
        nombre: nombre(reuniones, e.tipoReunion, 'tipo'),
      },
      nombreEvento: e.nombreEvento,
      materia: e.materia,
      comisiones: (e.comisiones ?? []).map((c) => ({
        id: c.idComision,
        nombre: nombresComision.get(c.idComision) ?? 'Comisión no encontrada',
      })),
      capturo: e.userRegistro
        ? (capturistas.get(e.userRegistro) ?? e.userRegistro)
        : null,
      // La más reciente primero.
      reprogramaciones: historial
        .filter((h) => h.registroPId === e.id)
        .map((h) => ({
          fechaAnterior: h.fechaAnterior,
          fechaFinAnterior: h.fechaFinAnterior,
          horaInicioAnterior: h.horaInicioAnterior?.slice(0, 5) ?? null,
          horaTerminoAnterior: h.horaTerminoAnterior?.slice(0, 5) ?? null,
          sedeAnterior:
            sedes.find((s) => s.id === h.sedeAnterior)?.nombre ?? null,
          fechaNueva: h.fechaNueva,
          motivo: h.motivo,
          por: h.userRfc ? (capturistas.get(h.userRfc) ?? h.userRfc) : null,
          el: h.createdAt,
        })),
    }));
  }
}
