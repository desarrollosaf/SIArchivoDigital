import { Table, Column, Model, DataType } from 'sequelize-typescript';

/**
 * Comisión legislativa (adminplem_congresoedomex.comisions, conexión "legislativo"). Solo se lee.
 * Con baja lógica: como en Laravel (SoftDeletes), solo se ofrecen las vigentes, pero los eventos
 * viejos siguen mostrando el nombre de las que ya se dieron de baja.
 */
@Table({
  tableName: 'comisions',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class ComisionLegislativo extends Model {
  @Column({ type: DataType.CHAR(36), primaryKey: true })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare nombre: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare alias: string;
}
