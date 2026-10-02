import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 't_departamento',
  underscored: false,
  timestamps: false,
})
export class TDepartamento extends Model {
  @Column({ primaryKey: true, type: DataType.INTEGER })
  declare id_Departamento: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare C_presupDepto: number;

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare Nombre: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare Creado: number;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare F_Creacion: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  declare U_Modificacion: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare Estado: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_Dependencia: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare id_Direccion: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare c_presup: number;

  @Column({ type: DataType.STRING(500), allowNull: true })
  declare nombre_completo: string;

  @Column({ type: DataType.TEXT('long'), allowNull: true })
  declare nom_cap: string;
}
