import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Registro } from './registro.model';
import { Respuesta } from './respuesta.model';

/** Comentario sobre un registro dirigido a una persona (tabla heredada `comments`). */
@Table({ tableName: 'comments', underscored: true, timestamps: true })
export class Comentario extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @ForeignKey(() => Registro)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true, field: 'reg_id' })
  declare regId: number;

  @BelongsTo(() => Registro, { foreignKey: 'regId', as: 'registro' })
  declare registro: Registro;

  @Column({ type: DataType.STRING, allowNull: false, field: 'user_rfc' })
  declare userRfc: string;

  @Column({ type: DataType.TEXT('long'), allowNull: true })
  declare comment: string | null;

  /** RFC del destinatario del comentario ("GLOBAL" para documentos anexos). */
  @Column({ type: DataType.TEXT('long'), allowNull: true, field: 'comment_to' })
  declare commentTo: string | null;

  /** Ruta relativa del adjunto, o "notfile" si no trae. */
  @Column({ type: DataType.STRING, allowNull: true, field: 'file_path' })
  declare filePath: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare status: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare notificacion: boolean;

  declare createdAt: Date;

  @HasMany(() => Respuesta, { foreignKey: 'idComment', as: 'respuestas' })
  declare respuestas: Respuesta[];
}
