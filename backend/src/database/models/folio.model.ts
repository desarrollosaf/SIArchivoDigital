import { Table, Column, Model, DataType } from 'sequelize-typescript';

/**
 * Consecutivo de folios por departamento y año (tabla heredada `folios`). El folio visible se
 * arma como `{uAdmin}/{folio}/{anio}`, p. ej. "40011/23/2024".
 */
@Table({ tableName: 'folios', underscored: true, timestamps: true })
export class Folio extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'id_departamento' })
  declare idDepartamento: number | null;

  /** Último consecutivo usado. */
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare folio: number;

  /** Clave presupuestal de la unidad administrativa (t_departamento.c_presup). */
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'uAdmin',
  })
  declare uAdmin: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare anio: number;
}
