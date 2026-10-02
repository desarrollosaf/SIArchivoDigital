import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { RegistroAtencion } from './registro-atencion.model';
import { TipoAtencion } from './catalogos-simples.model';
import { Serie } from './serie.model';
import { Comentario } from './comentario.model';
import { Agenda } from './agenda.model';

/**
 * Documento registrado (tabla heredada `registro`). Es la "correspondencia" del sistema:
 * quien la captura la turna a otros servidores públicos para su atención o conocimiento.
 *
 * - `status`: 1 pendiente, 0 concluido (todos los turnos de atención se cerraron).
 * - `activo`: 1 vigente, 0 cancelado por quien lo registró.
 * - `serie_id` 999 = "CORRESPONDENCIA" y 4161 = "EVENTOS" (Laravel lo escribía como 010101,
 *   un literal octal de PHP): no existen en la tabla `series`.
 */
@Table({ tableName: 'registro', underscored: true, timestamps: true })
export class Registro extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare folio: string;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'folio_rastreo' })
  declare folioRastreo: number | null;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
    field: 'fecha_recepcion',
  })
  declare fechaRecepcion: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
    field: 'fecha_documento',
  })
  declare fechaDocumento: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'referencia_documento',
  })
  declare referenciaDocumento: string | null;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
    field: 'fecha_limite_atencion',
  })
  declare fechaLimiteAtencion: string;

  @Column({ type: DataType.TIME, allowNull: true, field: 'hora_atencion' })
  declare horaAtencion: string | null;

  @ForeignKey(() => TipoAtencion)
  @Column({ type: DataType.INTEGER, allowNull: false, field: 'tipo_atencion' })
  declare tipoAtencion: number;

  @BelongsTo(() => TipoAtencion, {
    foreignKey: 'tipoAtencion',
    as: 'tipo',
    constraints: false,
  })
  declare tipo: TipoAtencion | null;

  @ForeignKey(() => Serie)
  @Column({ type: DataType.INTEGER, allowNull: false, field: 'serie_id' })
  declare serieId: number;

  @BelongsTo(() => Serie, {
    foreignKey: 'serieId',
    as: 'serie',
    constraints: false,
  })
  declare serie: Serie | null;

  /** En la interfaz se muestra como "Indicaciones". */
  @Column({
    type: DataType.TEXT('long'),
    allowNull: false,
    field: 'titulo_doc',
  })
  declare tituloDoc: string;

  /** En la interfaz se muestra como "Asunto". */
  @Column({
    type: DataType.TEXT('long'),
    allowNull: false,
    field: 'descripcion_doc',
  })
  declare descripcionDoc: string;

  /** Ruta relativa a la carpeta de documentos, o "nofile" si se registró sin archivo. */
  @Column({ type: DataType.TEXT('long'), allowNull: false })
  declare path: string;

  /** `users_safs.id` de quien capturó el registro. */
  @Column({ type: DataType.INTEGER, allowNull: false, field: 'user_registro' })
  declare userRegistro: number;

  /** RFC del remitente, o "999" cuando es externo (el nombre va en `otro_remitente`). */
  @Column({ type: DataType.STRING, allowNull: false, field: 'remitente_rfc' })
  declare remitenteRfc: string;

  @Column({ type: DataType.STRING, allowNull: true, field: 'otro_remitente' })
  declare otroRemitente: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare fojas: number | null;

  @Column({ type: DataType.TIME, allowNull: true, field: 'hora_termino' })
  declare horaTermino: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'tipo_solicitud' })
  declare tipoSolicitud: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare salon: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare status: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare activo: boolean;

  @Column({ type: DataType.STRING(500), allowNull: true, field: 'otraSerie' })
  declare otraSerie: string | null;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
    field: 'nombre_evento',
  })
  declare nombreEvento: string | null;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'destinatario_otro' })
  declare destinatarioOtro: string | null;

  @Column({ type: DataType.STRING(10), allowNull: true })
  declare destinatario: string | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'tipo_correspondencia',
  })
  declare tipoCorrespondencia: number | null;

  declare createdAt: Date;
  declare updatedAt: Date;

  @HasMany(() => RegistroAtencion, { foreignKey: 'registroId', as: 'turnos' })
  declare turnos: RegistroAtencion[];

  @HasMany(() => Comentario, { foreignKey: 'regId', as: 'comentarios' })
  declare comentarios: Comentario[];

  @HasMany(() => Agenda, { foreignKey: 'registroId', as: 'agendas' })
  declare agendas: Agenda[];
}
