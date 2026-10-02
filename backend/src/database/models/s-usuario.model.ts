import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 's_usuario', paranoid: false, timestamps: false })
export class SUsuario extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_Usuario',
  })
  declare id_Usuario: number;

  @Column({ type: DataType.STRING, allowNull: true, field: 'N_Usuario' })
  declare N_Usuario: string;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'id_Dependencia' })
  declare id_Dependencia: number;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'id_Direccion' })
  declare id_Direccion: number;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'id_Departamento' })
  declare id_Departamento: number;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'Nombre' })
  declare Nombre: string;

  @Column({ type: DataType.STRING(25), allowNull: true, field: 'A_Paterno' })
  declare A_Paterno: string;

  @Column({ type: DataType.STRING(25), allowNull: true, field: 'A_Materno' })
  declare A_Materno: string;

  @Column({
    type: DataType.STRING(70),
    allowNull: true,
    field: 'C_Electronico',
  })
  declare C_Electronico: string;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'Estado' })
  declare Estado: number;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'Puesto' })
  declare Puesto: string;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'f_ingreso' })
  declare f_ingreso: string;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'n_reloj' })
  declare n_reloj: string;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'n_reloj_historico' })
  declare n_reloj_historico: string | null;

  @Column({
    type: DataType.BIGINT.UNSIGNED,
    allowNull: true,
    field: 'edificio_id',
  })
  declare edificio_id: number | null;

  @Column({ type: DataType.TEXT, allowNull: false, field: 'sindicalizado' })
  declare sindicalizado: string;

  @Column({ type: DataType.STRING(18), allowNull: true, field: 'curp' })
  declare curp: string;

  @Column({ type: DataType.STRING, allowNull: true, field: 's_b' })
  declare s_b: string | null;
}
