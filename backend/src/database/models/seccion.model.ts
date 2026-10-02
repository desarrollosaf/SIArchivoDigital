import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Serie } from './serie.model';

/** Sección del cuadro de clasificación archivística (tabla heredada `secciones`). */
@Table({ tableName: 'secciones', underscored: true, timestamps: true })
export class Seccion extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare codigo: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare seccion: string;

  /** id_Departamento de adminplem_saf.t_departamento (la tabla lo guarda como texto). */
  @Column({ type: DataType.STRING, allowNull: false, field: 'departamento_id' })
  declare departamentoId: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare status: boolean;

  @HasMany(() => Serie, {
    foreignKey: 'idSeccion',
    as: 'series',
    constraints: false,
  })
  declare series: Serie[];
}
