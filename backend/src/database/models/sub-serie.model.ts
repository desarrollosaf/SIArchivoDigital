import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { Serie } from './serie.model';

/** Subserie documental (tabla heredada `sub_series`). */
@Table({ tableName: 'sub_series', underscored: true, timestamps: true })
export class SubSerie extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare codigo: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare subserie: string;

  @ForeignKey(() => Serie)
  @Column({ type: DataType.INTEGER, allowNull: false, field: 'idSerie' })
  declare idSerie: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare status: boolean;
}
