import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction, WhereOptions } from 'sequelize';
import type { Response } from 'express';
import { Registro } from '../database/models/registro.model';
import {
  RegistroAtencion,
  TIPO_TURNO_ATENCION,
  TIPO_TURNO_CONOCIMIENTO,
} from '../database/models/registro-atencion.model';
import { ArchivosService, tieneArchivo } from '../common/archivos.service';
import { PadronService } from '../common/padron.service';
import { AccesoService } from '../common/acceso.service';
import { DestinatariosService } from '../common/destinatarios.service';
import { EstatusRegistroService } from '../common/estatus-registro.service';
import { esAdministrador, UsuarioActual } from '../common/usuario-actual';
import { rangoFecha } from '../common/rango-fecha.util';
import { fechaHoyMexico } from '../common/fecha-mexico.util';
import { diasRestantes, nombreRemitente } from '../registros/registro-vista';
import { ConcluirTurnoDto, TurnarDto } from './dto/turnos.dto';

export type FiltroTurnos = 'pendientes' | 'atendidos';

const CARPETA_CONCLUSIONES = 'Conclusion';
const NOTA_CIERRE_EN_CASCADA = 'Atendido mediante los turnos que delegó.';

@Injectable()
export class TurnosService {
  constructor(
    @InjectModel(RegistroAtencion)
    private readonly atencionModel: typeof RegistroAtencion,
    @InjectModel(Registro) private readonly registroModel: typeof Registro,
    private readonly archivos: ArchivosService,
    private readonly padron: PadronService,
    private readonly acceso: AccesoService,
    private readonly destinatarios: DestinatariosService,
    private readonly estatusRegistro: EstatusRegistroService,
  ) {}

  /** Bandeja de entrada: turnos recibidos por el usuario (o su jefe, si es lector delegado). */
  async listar(
    usuario: UsuarioActual,
    filtro: FiltroTurnos,
    anio?: number,
    mes?: number,
  ) {
    const titular = await this.acceso.titular(usuario);
    // Como en Laravel, la bandeja también lista los documentos cancelados (marcados, sin
    // acciones); solo los contadores y la campana los excluyen.
    const whereRegistro: WhereOptions = {};
    if (anio) {
      const { desde, hasta } = rangoFecha(anio, mes);
      Object.assign(whereRegistro, {
        fechaRecepcion: { [Op.between]: [desde, hasta] },
      });
    }

    const turnos = await this.atencionModel.findAll({
      where: {
        userRfc: titular.rfc,
        statusAtencion: filtro === 'atendidos',
      },
      include: [
        {
          model: Registro,
          as: 'registro',
          where: whereRegistro,
          required: true,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const rfcs = turnos.flatMap((t) => [
      t.registro.remitenteRfc,
      t.userTurna ?? '',
    ]);
    const [nombres, registrantes] = await Promise.all([
      this.padron.nombresPorRfc(rfcs),
      this.padron.usuariosPorId(
        turnos.filter((t) => !t.userTurna).map((t) => t.registro.userRegistro),
      ),
    ]);

    return {
      soloLectura: titular.soloLectura,
      turnos: turnos.map((t) => {
        const r = t.registro;
        const turnadoPor = t.userTurna
          ? (nombres.get(t.userTurna) ?? t.userTurna)
          : (registrantes.get(Number(r.userRegistro))?.nombre ?? null);
        return {
          id: Number(t.id),
          registroId: Number(r.id),
          folio: r.folio,
          referencia: r.referenciaDocumento,
          asunto: r.descripcionDoc,
          indicaciones: t.indicacionesTurno || r.tituloDoc,
          remitente: nombreRemitente(r, nombres),
          tipo: t.tipoAtencion,
          urgente: Number(r.tipoAtencion) !== 1,
          fechaLimite: r.fechaLimiteAtencion,
          diasRestantes: filtro === 'pendientes' ? diasRestantes(r) : null,
          recibido: t.createdAt,
          visto: !!t.visto,
          nuevo: !!t.notificacion,
          turnadoPor,
          tieneArchivo: tieneArchivo(r.path),
          comentarioConclusion: t.comentarioConclusion,
          cancelado: !r.activo || !t.activo,
        };
      }),
    };
  }

  /** Contadores para la página de inicio, sin traer la bandeja completa. */
  async resumen(usuario: UsuarioActual) {
    const titular = await this.acceso.titular(usuario);
    const hoy = fechaHoyMexico();
    const base = { userRfc: titular.rfc, activo: true, statusAtencion: false };
    const registroActivo = (where: WhereOptions = {}) => [
      {
        model: Registro,
        as: 'registro',
        attributes: [],
        where: { activo: true, ...where },
        required: true,
      },
    ];
    const [pendientes, paraAtencion, vencidos, sinLeer, misPendientes] =
      await Promise.all([
        this.atencionModel.count({ where: base, include: registroActivo() }),
        this.atencionModel.count({
          where: { ...base, tipoAtencion: TIPO_TURNO_ATENCION },
          include: registroActivo(),
        }),
        this.atencionModel.count({
          where: { ...base, tipoAtencion: TIPO_TURNO_ATENCION },
          include: registroActivo({ fechaLimiteAtencion: { [Op.lt]: hoy } }),
        }),
        this.atencionModel.count({
          where: { ...base, visto: false },
          include: registroActivo(),
        }),
        this.registroModel.count({
          where: { userRegistro: titular.userId, activo: true, status: true },
        }),
      ]);
    return { pendientes, paraAtencion, vencidos, sinLeer, misPendientes };
  }

  async marcarVisto(id: number, usuario: UsuarioActual): Promise<void> {
    const turno = await this.turnoPropio(id, usuario, false);
    await turno.update({ visto: true, notificacion: false });
  }

  /**
   * Re-turna el documento a otras personas. Puede hacerlo quien tiene un turno en el registro o
   * quien lo capturó. Se omiten quienes ya tienen un turno activo en el registro (Laravel
   * rechazaba la operación completa en ese caso).
   */
  async turnar(registroId: number, dto: TurnarDto, usuario: UsuarioActual) {
    await this.acceso.exigirEscritura(usuario);
    const registro = await this.acceso.registroVisible(registroId, usuario);
    if (!registro.activo) {
      throw new BadRequestException('El registro está cancelado');
    }
    const propio = Number(registro.userRegistro) === usuario.sub;
    const tieneTurno = await this.atencionModel.count({
      where: { registroId, userRfc: usuario.rfc, activo: true },
    });
    if (!propio && !tieneTurno && !esAdministrador(usuario)) {
      throw new ForbiddenException(
        'Solo puedes turnar documentos que te fueron turnados',
      );
    }

    const { atencion, conocimiento } = await this.destinatarios.separar(
      dto.atencion,
      dto.conocimiento,
    );
    const existentes = new Map(
      (
        await this.atencionModel.findAll({
          where: { registroId, activo: true },
        })
      ).map((t) => [t.userRfc, t]),
    );
    const filas = [
      ...atencion.map((rfc) => ({ rfc, tipo: TIPO_TURNO_ATENCION })),
      ...conocimiento.map((rfc) => ({ rfc, tipo: TIPO_TURNO_CONOCIMIENTO })),
    ].filter((f) => f.rfc !== usuario.rfc);

    // Quien solo lo tenía para conocimiento puede recibirlo ahora para atención: su turno se
    // promueve en vez de duplicarse.
    const promovidos = filas
      .filter((f) => f.tipo === TIPO_TURNO_ATENCION)
      .map((f) => existentes.get(f.rfc))
      .filter(
        (t): t is RegistroAtencion =>
          !!t && t.tipoAtencion === TIPO_TURNO_CONOCIMIENTO,
      );
    const nuevos = filas.filter((f) => !existentes.has(f.rfc));
    const omitidos = filas
      .filter(
        (f) =>
          existentes.has(f.rfc) && !promovidos.some((t) => t.userRfc === f.rfc),
      )
      .map((f) => f.rfc);
    if (nuevos.length === 0 && promovidos.length === 0) {
      throw new BadRequestException(
        'Las personas seleccionadas ya tienen un turno en este documento.',
      );
    }

    await this.registroModel.sequelize!.transaction(async (transaction) => {
      await this.atencionModel.bulkCreate(
        nuevos.map((f) => ({
          registroId,
          userRfc: f.rfc,
          tipoAtencion: f.tipo,
          indicacionesTurno: dto.indicaciones ?? null,
          userTurna: usuario.rfc,
        })),
        { transaction },
      );
      for (const turno of promovidos) {
        await turno.update(
          {
            tipoAtencion: TIPO_TURNO_ATENCION,
            statusAtencion: false,
            notificacion: true,
            indicacionesTurno: dto.indicaciones ?? turno.indicacionesTurno,
            userTurna: usuario.rfc,
          },
          { transaction },
        );
      }
      await this.estatusRegistro.recalcular(registroId, transaction);
    });

    const nombres = await this.padron.nombresPorRfc(omitidos);
    return {
      agregados: nuevos.length + promovidos.length,
      omitidos: omitidos.map((rfc) => nombres.get(rfc) ?? rfc),
    };
  }

  /**
   * Cierra el turno del usuario. Si con eso quien le turnó ya no tiene turnos delegados
   * pendientes, su propio turno se cierra también (en cadena hacia arriba), y el registro queda
   * concluido cuando ya no hay turnos de atención pendientes.
   */
  async concluir(
    id: number,
    dto: ConcluirTurnoDto,
    archivo: Express.Multer.File | undefined,
    usuario: UsuarioActual,
  ) {
    await this.acceso.exigirEscritura(usuario);
    const turno = await this.turnoPropio(id, usuario, true);
    if (turno.statusAtencion) {
      throw new BadRequestException('Este turno ya fue atendido');
    }
    if (!dto.comentario && !archivo) {
      throw new BadRequestException(
        'Captura un comentario o adjunta el documento de respuesta.',
      );
    }
    const fileConclusion = archivo
      ? await this.archivos.guardar(archivo, CARPETA_CONCLUSIONES)
      : null;

    await this.registroModel.sequelize!.transaction(async (transaction) => {
      await turno.update(
        {
          statusAtencion: true,
          visto: true,
          notificacion: false,
          fileConclusion,
          comentarioConclusion: dto.comentario ?? null,
          seccionId: dto.seccionId ?? null,
          serieId: dto.serieId ?? null,
          subserieId: dto.subserieId ?? null,
        },
        { transaction },
      );
      await this.cerrarEnCascada(turno, transaction);
      await this.estatusRegistro.recalcular(turno.registroId, transaction);
    });
  }

  /** Quita un turno que aún no se atiende. Lo puede hacer quien lo turnó o quien capturó el registro. */
  async cancelar(id: number, usuario: UsuarioActual): Promise<void> {
    await this.acceso.exigirEscritura(usuario);
    const turno = await this.atencionModel.findByPk(id, {
      include: [{ model: Registro, as: 'registro' }],
    });
    if (!turno) throw new NotFoundException('El turno no existe');
    if (turno.statusAtencion)
      throw new BadRequestException('No se puede quitar un turno ya atendido');

    const propio = Number(turno.registro.userRegistro) === usuario.sub;
    if (
      turno.userTurna !== usuario.rfc &&
      !propio &&
      !esAdministrador(usuario)
    ) {
      throw new ForbiddenException('Solo quien turnó puede quitar este turno');
    }
    await this.registroModel.sequelize!.transaction(async (transaction) => {
      await turno.destroy({ transaction });
      await this.estatusRegistro.recalcular(turno.registroId, transaction);
    });
  }

  async enviarConclusion(id: number, usuario: UsuarioActual, res: Response) {
    const turno = await this.atencionModel.findByPk(id);
    if (!turno) throw new NotFoundException('El turno no existe');
    await this.acceso.registroVisible(turno.registroId, usuario);
    this.archivos.enviar(res, turno.fileConclusion);
  }

  private async turnoPropio(
    id: number,
    usuario: UsuarioActual,
    escritura: boolean,
  ) {
    const turno = await this.atencionModel.findByPk(id);
    if (!turno || !turno.activo)
      throw new NotFoundException('El turno no existe');
    const titular = await this.acceso.titular(usuario);
    const permitidos = escritura ? [usuario.rfc] : [usuario.rfc, titular.rfc];
    if (!permitidos.includes(turno.userRfc)) {
      throw new ForbiddenException('Este turno no es tuyo');
    }
    return turno;
  }

  private async cerrarEnCascada(
    turno: RegistroAtencion,
    transaction: Transaction,
  ) {
    let delegante = turno.userTurna;
    const visitados = new Set<string>();
    while (delegante && !visitados.has(delegante)) {
      visitados.add(delegante);
      const pendientesDelegados = await this.atencionModel.count({
        where: {
          registroId: turno.registroId,
          userTurna: delegante,
          tipoAtencion: TIPO_TURNO_ATENCION,
          statusAtencion: false,
          activo: true,
        },
        transaction,
      });
      if (pendientesDelegados > 0) return;

      const turnoDelegante = await this.atencionModel.findOne({
        where: {
          registroId: turno.registroId,
          userRfc: delegante,
          tipoAtencion: TIPO_TURNO_ATENCION,
          statusAtencion: false,
          activo: true,
        },
        transaction,
      });
      if (!turnoDelegante) return;

      await turnoDelegante.update(
        {
          statusAtencion: true,
          comentarioConclusion:
            turnoDelegante.comentarioConclusion ?? NOTA_CIERRE_EN_CASCADA,
        },
        { transaction },
      );
      delegante = turnoDelegante.userTurna;
    }
  }
}
