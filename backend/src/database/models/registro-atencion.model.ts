import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Registro } from './registro.model';

export const TIPO_TURNO_ATENCION = 'A';
export const TIPO_TURNO_CONOCIMIENTO = 'C';

/**
 * Turno de un registro (tabla heredada `registro_atencions`): a quién se le envió el documento y
 * si es para su atención ("A") o solo para su conocimiento ("C"). Las columnas mezclan camelCase y
 * snake_case tal cual las dejó Laravel.
 */
@Table({ tableName: 'registro_atencions', underscored: true, timestamps: true })
export class RegistroAtencion extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @ForeignKey(() => Registro)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: false,
    field: 'registro_id',
  })
  declare registroId: number;

  @BelongsTo(() => Registro, { foreignKey: 'registroId', as: 'registro' })
  declare registro: Registro;

  @Column({ type: DataType.STRING, allowNull: false, field: 'user_rfc' })
  declare userRfc: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare visto: boolean;

  /** 0 pendiente, 1 atendido. */
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'statusAtencion',
  })
  declare statusAtencion: boolean;

  @Column({ type: DataType.STRING, allowNull: false, field: 'tipoAtencion' })
  declare tipoAtencion: string;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
    field: 'indicaciones_turno',
  })
  declare indicacionesTurno: string | null;

  @Column({ type: DataType.STRING, allowNull: true, field: 'file_conclusion' })
  declare fileConclusion: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'comentario_conclusion',
  })
  declare comentarioConclusion: string | null;

  /** RFC de quien turnó (vacío cuando el turno se generó al registrar el documento). */
  @Column({ type: DataType.STRING, allowNull: true, field: 'user_turna' })
  declare userTurna: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare activo: boolean;

  /** 1 mientras el destinatario no haya abierto la notificación. */
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare notificacion: boolean;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'seccion_id' })
  declare seccionId: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'serie_id' })
  declare serieId: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'subserie_id' })
  declare subserieId: number | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    field: 'user_rfc_anterior',
  })
  declare userRfcAnterior: string | null;

  declare createdAt: Date;
  declare updatedAt: Date;
}
