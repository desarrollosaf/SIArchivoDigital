import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 't_direccion',
  underscored: false,
  timestamps: false,
})
export class TDireccion extends Model {
  @Column({ primaryKey: true, type: DataType.INTEGER })
  declare id_Direccion: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare C_presupDir: number;

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare Nombre: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare F_Creacion: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare U_Modificacion: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare Estado: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare Creado: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_Dependencia: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare c_presup: number;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare nombre_completo: string;
}
