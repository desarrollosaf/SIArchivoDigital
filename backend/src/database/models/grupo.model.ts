import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Grupo de destinatarios para turnar a varias personas a la vez (tabla heredada `groups`). */
@Table({ tableName: 'groups', underscored: true, timestamps: true })
export class Grupo extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare grupo: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare activo: boolean;
}

/** Integrante de un grupo (tabla heredada `members`; `id_group` se guarda como texto). */
@Table({ tableName: 'members', underscored: true, timestamps: true })
export class Miembro extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false, field: 'id_group' })
  declare idGroup: string;

  @Column({ type: DataType.STRING, allowNull: false, field: 'user_rfc' })
  declare userRfc: string;
}
