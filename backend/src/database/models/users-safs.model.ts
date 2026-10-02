import {
  Table,
  Column,
  Model,
  DataType,
  HasOne,
  DeletedAt,
} from 'sequelize-typescript';
import { SUsuario } from './s-usuario.model';

@Table({
  tableName: 'users_safs',
  paranoid: true,
  underscored: true,
  timestamps: true,
})
export class UsersSafs extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare email: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare rfc: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare password: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare cambio_contrasena: number;

  @Column({ type: DataType.STRING(10), allowNull: true })
  declare cel: string;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare path_foto: string;

  /** Intentos fallidos acumulados; la tabla es compartida por los sistemas de la SAF. */
  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  declare intentos: number | null;

  /** 1 = cuenta bloqueada por intentos fallidos (lo pone p. ej. SIDocumentacion). */
  @Column({ type: DataType.INTEGER, allowNull: true, defaultValue: 0 })
  declare bloqueo: number | null;

  @DeletedAt
  declare deleted_at: Date;

  @HasOne(() => SUsuario, {
    sourceKey: 'rfc',
    foreignKey: 'N_Usuario',
    as: 'datos_user',
  })
  declare datos_user: SUsuario;
}
