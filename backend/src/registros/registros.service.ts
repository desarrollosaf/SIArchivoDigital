import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, QueryTypes, Transaction, WhereOptions, literal } from 'sequelize';
import type { Response } from 'express';
import { Registro } from '../database/models/registro.model';
import {
  RegistroAtencion,
  TIPO_TURNO_ATENCION,
  TIPO_TURNO_CONOCIMIENTO,
} from '../database/models/registro-atencion.model';
import { Comentario } from '../database/models/comentario.model';
import { Respuesta } from '../database/models/respuesta.model';
import { Folio } from '../database/models/folio.model';
import { TipoAtencion } from '../database/models/catalogos-simples.model';
import { ArchivosService, tieneArchivo } from '../common/archivos.service';
import { PadronService } from '../common/padron.service';
import { AccesoService } from '../common/acceso.service';
import { DestinatariosService } from '../common/destinatarios.service';
import { AgendaSyncService } from '../common/agenda-sync.service';
import { EstatusRegistroService } from '../common/estatus-registro.service';
import { esAdministrador, UsuarioActual } from '../common/usuario-actual';
import { anioActualMexico, fechaHoyMexico } from '../common/fecha-mexico.util';
import { rangoFecha } from '../common/rango-fecha.util';
import { CatalogosService } from '../catalogos/catalogos.service';
import { RegistroDto } from './dto/registro.dto';
import {
  REMITENTE_EXTERNO,
  diasRestantes,
  estatusRegistro,
  horaCorta,
  nombreRemitente,
} from './registro-vista';

export type FiltroEstatus =
  'pendientes' | 'concluidos' | 'cancelados' | 'todos';

const CARPETA_REGISTROS = 'registros';

function horaCompleta(valor: string | undefined): string | null {
  if (!valor) return null;
  return valor.length === 5 ? `${valor}:00` : valor;
}

@Injectable()
export class RegistrosService {
  constructor(
    @InjectModel(Registro) private readonly registroModel: typeof Registro,
    @InjectModel(RegistroAtencion)
    private readonly atencionModel: typeof RegistroAtencion,
    @InjectModel(Comentario)
    private readonly comentarioModel: typeof Comentario,
    @InjectModel(Folio) private readonly folioModel: typeof Folio,
    @InjectModel(TipoAtencion)
    private readonly tipoAtencionModel: typeof TipoAtencion,
    private readonly archivos: ArchivosService,
    private readonly padron: PadronService,
    private readonly acceso: AccesoService,
    private readonly destinatarios: DestinatariosService,
    private readonly agenda: AgendaSyncService,
    private readonly estatusRegistro: EstatusRegistroService,
    private readonly catalogos: CatalogosService,
  ) {}

  /** Folio que le tocaría al siguiente registro (solo informativo: se asigna al guardar). */
  async contextoNuevo(usuario: UsuarioActual) {
    const perfil = await this.padron.perfil(usuario.rfc);
    const anio = anioActualMexico();
    let folio: string | null = null;
    if (perfil?.idDepartamento) {
      const fila = await this.folioModel.findOne({
        where: { idDepartamento: perfil.idDepartamento, anio },
      });
      const uAdmin = fila?.uAdmin || perfil.clavePresupuestal || 0;
      const usado = await this.consecutivoReciente(uAdmin, anio);
      folio = `${uAdmin}/${Math.max(fila?.folio ?? 0, usado) + 1}/${anio}`;
    }
    return {
      folio,
      fechaHoy: fechaHoyMexico(),
      departamento: perfil?.departamento ?? null,
      sinDepartamento: !perfil?.idDepartamento,
    };
  }

  /** Bandeja de salida: lo que registró el usuario (o su jefe, si es lector delegado). */
  async listar(
    usuario: UsuarioActual,
    anio: number,
    mes: number | undefined,
    estatus: FiltroEstatus,
  ) {
    const titular = await this.acceso.titular(usuario);
    const { desde, hasta } = rangoFecha(anio, mes);
    const where: WhereOptions = {
      userRegistro: titular.userId,
      fechaRecepcion: { [Op.between]: [desde, hasta] },
      ...this.filtroEstatus(estatus),
    };

    const registros = await this.registroModel.findAll({
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
      order: [['createdAt', 'DESC']],
    });
    return this.aFilas(registros);
  }

  /** Búsqueda por folio, referencia, asunto, indicaciones o remitente. */
  async buscar(usuario: UsuarioActual, termino: string) {
    const q = termino?.trim();
    if (!q || q.length < 2) return [];

    const rfcsRemitente = await this.padron.rfcsPorNombre(q);
    const like = { [Op.like]: `%${q}%` };
    const coincidencias: WhereOptions[] = [
      { folio: like },
      { referenciaDocumento: like },
      { tituloDoc: like },
      { descripcionDoc: like },
      { otroRemitente: like },
    ];
    if (rfcsRemitente.length)
      coincidencias.push({ remitenteRfc: { [Op.in]: rfcsRemitente } });

    const condiciones: WhereOptions[] = [{ [Op.or]: coincidencias }];
    if (!esAdministrador(usuario)) {
      const titular = await this.acceso.titular(usuario);
      const rfcs = [...new Set([usuario.rfc, titular.rfc])].map((r) =>
        this.registroModel.sequelize!.escape(r),
      );
      condiciones.push({
        [Op.or]: [
          { userRegistro: { [Op.in]: [usuario.sub, titular.userId] } },
          {
            id: {
              [Op.in]: literal(
                `(SELECT registro_id FROM registro_atencions WHERE user_rfc IN (${rfcs.join(',')}))`,
              ),
            },
          },
        ],
      });
    }

    const registros = await this.registroModel.findAll({
      where: { [Op.and]: condiciones },
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
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    return this.aFilas(registros);
  }

  /** Registros propios para relacionar uno nuevo como seguimiento ("folio de rastreo"). */
  async rastreables(usuario: UsuarioActual, search?: string) {
    const where: WhereOptions = { userRegistro: usuario.sub };
    if (search?.trim())
      Object.assign(where, { folio: { [Op.like]: `%${search.trim()}%` } });
    const rows = await this.registroModel.findAll({
      attributes: ['id', 'folio', 'descripcionDoc'],
      where,
      order: [['createdAt', 'DESC']],
      limit: 30,
    });
    return rows.map((r) => ({
      id: Number(r.id),
      nombre: r.folio,
      detalle: r.descripcionDoc?.slice(0, 120) ?? null,
    }));
  }

  async detalle(id: number, usuario: UsuarioActual) {
    const registro = await this.acceso.registroVisible(id, usuario);
    const titular = await this.acceso.titular(usuario);

    const [turnos, comentarios, tipo, rastreo] = await Promise.all([
      this.atencionModel.findAll({
        where: { registroId: id },
        order: [['createdAt', 'ASC']],
      }),
      this.comentarioModel.findAll({
        where: { regId: id },
        include: [{ model: Respuesta, as: 'respuestas' }],
        order: [
          ['createdAt', 'ASC'],
          [{ model: Respuesta, as: 'respuestas' }, 'createdAt', 'ASC'],
        ],
      }),
      registro.tipoAtencion
        ? this.tipoAtencionModel.findByPk(registro.tipoAtencion)
        : Promise.resolve(null),
      registro.folioRastreo
        ? this.registroModel.findByPk(registro.folioRastreo, {
            attributes: ['id', 'folio'],
          })
        : Promise.resolve(null),
    ]);

    const rfcs = [
      registro.remitenteRfc,
      ...turnos.flatMap((t) => [t.userRfc, t.userTurna ?? '']),
      ...comentarios.flatMap((c) => [
        c.userRfc,
        c.commentTo ?? '',
        ...(c.respuestas ?? []).map((r) => r.userRfc),
      ]),
    ];
    const [nombres, registradoPor, series] = await Promise.all([
      this.padron.nombresPorRfc(rfcs),
      this.padron.usuariosPorId([registro.userRegistro]),
      this.catalogos.nombresSeries([registro.serieId]),
    ]);
    const nombre = (rfc: string | null | undefined) =>
      rfc ? (nombres.get(rfc) ?? rfc) : null;

    const esPropio =
      esAdministrador(usuario) || Number(registro.userRegistro) === usuario.sub;
    const misTurnos = turnos.filter(
      (t) => t.userRfc === titular.rfc && t.activo,
    );
    const miTurno =
      misTurnos.find(
        (t) => t.tipoAtencion === TIPO_TURNO_ATENCION && !t.statusAtencion,
      ) ??
      misTurnos.find((t) => t.tipoAtencion === TIPO_TURNO_ATENCION) ??
      misTurnos[0] ??
      null;

    const deRegistro = turnos.filter((t) => !t.userTurna);
    const persona = (rfc: string) => ({ id: rfc, nombre: nombre(rfc) ?? rfc });

    return {
      id: Number(registro.id),
      folio: registro.folio,
      folioRastreo: rastreo
        ? { id: Number(rastreo.id), folio: rastreo.folio }
        : null,
      fechaRecepcion: registro.fechaRecepcion,
      fechaDocumento: registro.fechaDocumento,
      referenciaDocumento: registro.referenciaDocumento,
      fechaLimiteAtencion: registro.fechaLimiteAtencion,
      horaInicio: horaCorta(registro.horaAtencion),
      horaTermino: horaCorta(registro.horaTermino),
      tipoAtencion: { id: registro.tipoAtencion, nombre: tipo?.tipo ?? '' },
      serie: {
        id: registro.serieId,
        nombre: series.get(registro.serieId) ?? registro.otraSerie ?? '',
      },
      indicaciones: registro.tituloDoc,
      asunto: registro.descripcionDoc,
      remitente: {
        rfc: registro.remitenteRfc,
        nombre: nombreRemitente(registro, nombres),
      },
      otroRemitente: registro.otroRemitente,
      fojas: registro.fojas,
      tipoSolicitud: registro.tipoSolicitud,
      salon: registro.salon,
      nombreEvento: registro.nombreEvento,
      registradoPor: registradoPor.get(Number(registro.userRegistro)) ?? null,
      creado: registro.createdAt,
      estatus: estatusRegistro(registro),
      diasRestantes: diasRestantes(registro),
      tieneArchivo: tieneArchivo(registro.path),
      destinatariosRegistro: {
        atencion: deRegistro
          .filter((t) => t.tipoAtencion === TIPO_TURNO_ATENCION)
          .map((t) => persona(t.userRfc)),
        conocimiento: deRegistro
          .filter((t) => t.tipoAtencion === TIPO_TURNO_CONOCIMIENTO)
          .map((t) => persona(t.userRfc)),
      },
      turnos: turnos.map((t) => ({
        id: Number(t.id),
        rfc: t.userRfc,
        nombre: nombre(t.userRfc),
        tipo: t.tipoAtencion,
        atendido: !!t.statusAtencion,
        visto: !!t.visto,
        activo: !!t.activo,
        indicaciones: t.indicacionesTurno,
        turnadoPor: t.userTurna
          ? { rfc: t.userTurna, nombre: nombre(t.userTurna) }
          : null,
        comentarioConclusion: t.comentarioConclusion,
        tieneConclusion: tieneArchivo(t.fileConclusion),
        fecha: t.createdAt,
        puedeCancelar:
          !titular.soloLectura &&
          !t.statusAtencion &&
          (t.userTurna === usuario.rfc || esPropio),
      })),
      comentarios: comentarios.map((c) => ({
        id: Number(c.id),
        autor: { rfc: c.userRfc, nombre: nombre(c.userRfc) },
        para:
          c.commentTo && c.commentTo !== 'GLOBAL'
            ? { rfc: c.commentTo, nombre: nombre(c.commentTo) }
            : null,
        texto: c.comment,
        tieneArchivo: tieneArchivo(c.filePath),
        fecha: c.createdAt,
        respuestas: (c.respuestas ?? []).map((r) => ({
          id: Number(r.id),
          autor: { rfc: r.userRfc, nombre: nombre(r.userRfc) },
          texto: r.comment,
          tieneArchivo: tieneArchivo(r.filePath),
          fecha: r.createdAt,
        })),
      })),
      permisos: {
        soloLectura: titular.soloLectura,
        editar: esPropio && !!registro.activo && !titular.soloLectura,
        cancelar: esPropio && !!registro.activo && !titular.soloLectura,
        comentar: !!registro.activo && !titular.soloLectura,
        miTurno: miTurno
          ? {
              id: Number(miTurno.id),
              tipo: miTurno.tipoAtencion,
              atendido: !!miTurno.statusAtencion,
            }
          : null,
      },
    };
  }

  async crear(
    dto: RegistroDto,
    archivo: Express.Multer.File | undefined,
    usuario: UsuarioActual,
  ) {
    this.validarRemitente(dto);
    const perfil = await this.padron.perfil(usuario.rfc);
    if (!perfil?.idDepartamento) {
      throw new BadRequestException(
        'Tu usuario no tiene un departamento asignado en el padrón; no se puede generar el folio.',
      );
    }
    const { atencion, conocimiento } = await this.destinatarios.separar(
      dto.atencion,
      dto.conocimiento,
    );
    if (atencion.length === 0 && conocimiento.length === 0) {
      throw new BadRequestException(
        'Agrega al menos un destinatario para atención o conocimiento.',
      );
    }

    const path = archivo
      ? await this.archivos.guardar(archivo, CARPETA_REGISTROS)
      : 'nofile';

    const registro = await this.registroModel.sequelize!.transaction(
      async (transaction) => {
        const folio = await this.siguienteFolio(
          perfil.idDepartamento!,
          perfil.clavePresupuestal,
          transaction,
        );
        const nuevo = await this.registroModel.create(
          {
            ...this.camposRegistro(dto),
            folio,
            path,
            userRegistro: usuario.sub,
            status: true,
            activo: true,
          },
          { transaction },
        );
        await this.crearTurnos(nuevo.id, atencion, conocimiento, transaction);
        await this.agenda.sincronizar(nuevo, transaction);
        await this.agenda.sincronizarPresidencia(nuevo, transaction);
        return nuevo;
      },
    );

    return { id: Number(registro.id), folio: registro.folio };
  }

  async editar(
    id: number,
    dto: RegistroDto,
    archivo: Express.Multer.File | undefined,
    usuario: UsuarioActual,
  ) {
    this.validarRemitente(dto);
    await this.acceso.exigirEscritura(usuario);
    const registro = await this.acceso.registroPropio(id, usuario);
    if (!registro.activo) {
      throw new BadRequestException('El registro está cancelado');
    }
    const { atencion, conocimiento } = await this.destinatarios.separar(
      dto.atencion,
      dto.conocimiento,
    );
    const path = archivo
      ? await this.archivos.guardar(archivo, CARPETA_REGISTROS)
      : registro.path;

    await this.registroModel.sequelize!.transaction(async (transaction) => {
      await registro.update(
        { ...this.camposRegistro(dto), path },
        { transaction },
      );
      await this.sincronizarTurnosDeRegistro(
        registro.id,
        atencion,
        conocimiento,
        transaction,
      );
      await this.estatusRegistro.recalcular(registro.id, transaction);
      await registro.reload({ transaction });
      await this.agenda.sincronizar(registro, transaction);
      await this.agenda.sincronizarPresidencia(registro, transaction);
    });
  }

  /** Cancela el registro: deja de aparecer en las bandejas de los destinatarios y en la agenda. */
  async cancelar(id: number, usuario: UsuarioActual) {
    await this.acceso.exigirEscritura(usuario);
    const registro = await this.acceso.registroPropio(id, usuario);
    await this.registroModel.sequelize!.transaction(async (transaction) => {
      await registro.update({ activo: false }, { transaction });
      await this.atencionModel.update(
        { activo: false },
        { where: { registroId: id }, transaction },
      );
      await this.agenda.eliminar(id, transaction);
    });
  }

  /** Entrega el documento; si quien lo abre tiene un turno, se marca como visto. */
  async enviarArchivo(id: number, usuario: UsuarioActual, res: Response) {
    const registro = await this.acceso.registroVisible(id, usuario);
    await this.atencionModel.update(
      { visto: true, notificacion: false },
      { where: { registroId: id, userRfc: usuario.rfc } },
    );
    const extension = registro.path.split('.').pop();
    this.archivos.enviar(
      res,
      registro.path,
      `${registro.folio.replace(/\//g, '-')}.${extension}`,
    );
  }

  private filtroEstatus(estatus: FiltroEstatus): WhereOptions {
    switch (estatus) {
      // Igual que la bandeja de salida de Laravel: "pendientes" y "concluidos" se distinguen solo
      // por status, así que incluyen los cancelados (que se muestran marcados).
      case 'pendientes':
        return { status: true };
      case 'concluidos':
        return { status: false };
      case 'cancelados':
        return { activo: false };
      default:
        return {};
    }
  }

  private async aFilas(registros: Registro[]) {
    const rfcs = registros.flatMap((r) => [
      r.remitenteRfc,
      ...(r.turnos ?? []).map((t) => t.userRfc),
    ]);
    const nombres = await this.padron.nombresPorRfc(rfcs);
    return registros.map((r) => {
      const turnos = (r.turnos ?? []).filter((t) => t.activo || !r.activo);
      return {
        id: Number(r.id),
        folio: r.folio,
        referencia: r.referenciaDocumento,
        asunto: r.descripcionDoc,
        indicaciones: r.tituloDoc,
        remitente: nombreRemitente(r, nombres),
        tipo: r.tipo?.tipo ?? '',
        urgente: Number(r.tipoAtencion) !== 1,
        fechaRecepcion: r.fechaRecepcion,
        fechaLimite: r.fechaLimiteAtencion,
        creado: r.createdAt,
        estatus: estatusRegistro(r),
        diasRestantes: diasRestantes(r),
        tieneArchivo: tieneArchivo(r.path),
        turnos: turnos.map((t) => ({
          nombre: nombres.get(t.userRfc) ?? t.userRfc,
          tipo: t.tipoAtencion,
          atendido: !!t.statusAtencion,
        })),
      };
    });
  }

  private validarRemitente(dto: RegistroDto): void {
    if (dto.remitenteRfc === REMITENTE_EXTERNO && !dto.otroRemitente) {
      throw new BadRequestException('Captura el nombre del remitente externo.');
    }
    if (dto.fechaLimiteAtencion < dto.fechaRecepcion) {
      throw new BadRequestException(
        'La fecha límite de atención no puede ser anterior a la de recepción.',
      );
    }
  }

  private camposRegistro(dto: RegistroDto) {
    return {
      fechaRecepcion: dto.fechaRecepcion,
      fechaDocumento: dto.fechaDocumento ?? null,
      referenciaDocumento: dto.referenciaDocumento ?? null,
      fechaLimiteAtencion: dto.fechaLimiteAtencion,
      horaAtencion: horaCompleta(dto.horaInicio),
      horaTermino: horaCompleta(dto.horaTermino),
      tipoAtencion: dto.tipoAtencion,
      serieId: dto.serieId,
      tituloDoc: dto.tituloDoc,
      descripcionDoc: dto.descripcionDoc,
      remitenteRfc: dto.remitenteRfc.toUpperCase(),
      otroRemitente:
        dto.remitenteRfc === REMITENTE_EXTERNO
          ? (dto.otroRemitente ?? null)
          : null,
      fojas: dto.fojas ?? null,
      tipoSolicitud: dto.tipoSolicitud ?? null,
      salon: dto.salon ?? null,
      nombreEvento: dto.nombreEvento ?? null,
      folioRastreo: dto.folioRastreo ?? null,
    };
  }

  /**
   * Consecutivo por departamento y año. La fila se bloquea dentro de la transacción para que dos
   * capturas simultáneas no obtengan el mismo folio.
   */
  private async siguienteFolio(
    idDepartamento: number,
    clavePresupuestal: number | null,
    transaction: Transaction,
  ) {
    const anio = anioActualMexico();
    let fila = await this.folioModel.findOne({
      where: { idDepartamento, anio },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!fila) {
      fila = await this.folioModel.create(
        { idDepartamento, anio, folio: 0, uAdmin: clavePresupuestal ?? 0 },
        { transaction },
      );
    }
    let consecutivo =
      Math.max(
        Number(fila.folio),
        await this.consecutivoReciente(fila.uAdmin, anio, transaction),
      ) + 1;
    while (
      await this.registroModel.count({
        where: { folio: `${fila.uAdmin}/${consecutivo}/${anio}` },
        transaction,
      })
    ) {
      consecutivo++;
    }
    fila.folio = consecutivo;
    await fila.save({ transaction });
    return `${fila.uAdmin}/${fila.folio}/${anio}`;
  }

  /**
   * En Laravel el folio se podía editar a mano en el formulario y entonces el contador de
   * `folios` no avanzaba (p. ej. contador en 5 con registros "40011/3546/2026"). Se toma el
   * consecutivo más alto entre los registros más recientes con ese prefijo: no el máximo
   * absoluto, porque hay folios mal capturados (p. ej. "40011/171030042026/2026").
   */
  private async consecutivoReciente(
    uAdmin: number,
    anio: number,
    transaction?: Transaction,
  ): Promise<number> {
    const [fila] = await this.registroModel.sequelize!.query<{
      mayor: number | null;
    }>(
      'SELECT MAX(t.consecutivo) AS mayor FROM (' +
        "SELECT CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(folio, '/', 2), '/', -1) AS UNSIGNED) AS consecutivo " +
        'FROM registro WHERE folio LIKE :patron ORDER BY id DESC LIMIT 50) t',
      {
        replacements: { patron: `${uAdmin}/%/${anio}` },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    return Number(fila?.mayor ?? 0);
  }

  private async crearTurnos(
    registroId: number,
    atencion: string[],
    conocimiento: string[],
    transaction: Transaction,
  ) {
    const filas = [
      ...atencion.map((userRfc) => ({
        registroId,
        userRfc,
        tipoAtencion: TIPO_TURNO_ATENCION,
      })),
      ...conocimiento.map((userRfc) => ({
        registroId,
        userRfc,
        tipoAtencion: TIPO_TURNO_CONOCIMIENTO,
      })),
    ];
    if (filas.length) {
      await this.atencionModel.bulkCreate(filas, { transaction });
    }
  }

  /**
   * Al editar, Laravel borraba todos los turnos y los volvía a crear (perdiendo conclusiones y
   * re-turnos). Aquí solo se tocan los turnos que nacieron con el registro: se quitan los que ya no
   * están (si siguen pendientes), se agregan los nuevos y los demás se conservan tal cual.
   */
  private async sincronizarTurnosDeRegistro(
    registroId: number,
    atencion: string[],
    conocimiento: string[],
    transaction: Transaction,
  ) {
    const actuales = await this.atencionModel.findAll({
      where: { registroId, userTurna: null },
      transaction,
    });
    const deseados = new Map<string, string>([
      ...conocimiento.map((rfc) => [rfc, TIPO_TURNO_CONOCIMIENTO] as const),
      ...atencion.map((rfc) => [rfc, TIPO_TURNO_ATENCION] as const),
    ]);

    for (const turno of actuales) {
      const tipoDeseado = deseados.get(turno.userRfc);
      if (tipoDeseado === turno.tipoAtencion) {
        deseados.delete(turno.userRfc);
      } else if (!turno.statusAtencion) {
        await turno.destroy({ transaction });
      } else {
        deseados.delete(turno.userRfc);
      }
    }

    const nuevos = [...deseados.entries()];
    await this.crearTurnos(
      registroId,
      nuevos
        .filter(([, tipo]) => tipo === TIPO_TURNO_ATENCION)
        .map(([rfc]) => rfc),
      nuevos
        .filter(([, tipo]) => tipo === TIPO_TURNO_CONOCIMIENTO)
        .map(([rfc]) => rfc),
      transaction,
    );
  }
}
