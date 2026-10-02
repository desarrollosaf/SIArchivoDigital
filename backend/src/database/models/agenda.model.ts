import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Registro } from './registro.model';

export const COLOR_AGENDA_ORDINARIO = '#F8D720';
export const COLOR_AGENDA_URGENTE = '#F78300';
export const COLOR_AGENDA_CONCLUIDO = '#56534F';

/** Evento de agenda ligado a la fecha límite de atención de un registro (tabla `agendas`). */
@Table({ tableName: 'agendas', underscored: true, timestamps: true })
export class Agenda extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @ForeignKey(() => Registro)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    field: 'registro_id',
  })
  declare registroId: number | null;

  @BelongsTo(() => Registro, { foreignKey: 'registroId', as: 'registro' })
  declare registro: Registro | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT('long'), allowNull: false })
  declare descripcion: string;

  /** Fecha y hora "de pared" en México, guardada tal cual en un DATETIME. */
  @Column({ type: DataType.STRING, allowNull: false })
  declare start: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare end: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare empieza: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare termina: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare hora: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare color: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare status: boolean;
}
