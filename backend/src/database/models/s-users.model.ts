import { Table, Column, Model, DataType } from 'sequelize-typescript';

/**
 * Cuentas del padrón centralizado (adminplem_saf.s_users). Solo se lee `rango`, el nivel
 * jerárquico (1 y 2 directivos, 3 jefaturas, 4 y 5 operativos). Se declara `username` como llave
 * para no depender del nombre real de la llave primaria: este modelo nunca escribe.
 */
@Table({ tableName: 's_users', timestamps: false })
export class SUsers extends Model {
  @Column({ type: DataType.STRING, primaryKey: true })
  declare username: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare rango: number | null;
}
