import { Table, Column, Model, DataType } from 'sequelize-typescript';

/**
 * Lector delegado (tabla heredada `us_lecturas`): `user_rfc` puede consultar, sin modificar,
 * las bandejas de su jefe (`rfc_jefe`; `id_jefe` es su `users_safs.id`).
 */
@Table({ tableName: 'us_lecturas', underscored: true, timestamps: true })
export class UsLectura extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false, field: 'user_rfc' })
  declare userRfc: string;

  @Column({ type: DataType.STRING, allowNull: true, field: 'rfc_jefe' })
  declare rfcJefe: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'id_jefe' })
  declare idJefe: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare status: boolean;
}
