import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Comentario } from './comentario.model';

/** Respuesta a un comentario (tabla heredada `answers`). */
@Table({ tableName: 'answers', underscored: true, timestamps: true })
export class Respuesta extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true, field: 'reg_id' })
  declare regId: number;

  @ForeignKey(() => Comentario)
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    field: 'id_comment',
  })
  declare idComment: number;

  @BelongsTo(() => Comentario, { foreignKey: 'idComment', as: 'comentario' })
  declare comentario: Comentario;

  @Column({ type: DataType.STRING, allowNull: false, field: 'user_rfc' })
  declare userRfc: string;

  @Column({ type: DataType.TEXT('long'), allowNull: true })
  declare comment: string | null;

  @Column({ type: DataType.STRING, allowNull: true, field: 'file_path' })
  declare filePath: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare status: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare notificacion: boolean;

  declare createdAt: Date;
}
