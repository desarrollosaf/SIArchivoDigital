import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  HasMany,
  ForeignKey,
} from 'sequelize-typescript';
import { Seccion } from './seccion.model';
import { SubSerie } from './sub-serie.model';

/** Serie documental (tabla heredada `series`). */
@Table({ tableName: 'series', underscored: true, timestamps: true })
export class Serie extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @ForeignKey(() => Seccion)
  @Column({ type: DataType.INTEGER, allowNull: false, field: 'idSeccion' })
  declare idSeccion: number;

  @BelongsTo(() => Seccion, {
    foreignKey: 'idSeccion',
    as: 'seccionRel',
    constraints: false,
  })
  declare seccionRel: Seccion | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare codigo: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare serie: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'departamento_id',
  })
  declare departamentoId: number;

  /** Si la serie pide hora de inicio y de término al registrar (eventos, reuniones...). */
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare horarios: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare status: boolean;

  /** Días que el documento permanece en archivo de trámite antes de pasar a concentración. */
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 730,
    field: 'duracionSistema',
  })
  declare duracionSistema: number | null;

  @HasMany(() => SubSerie, {
    foreignKey: 'idSerie',
    as: 'subseries',
    constraints: false,
  })
  declare subseries: SubSerie[];
}
