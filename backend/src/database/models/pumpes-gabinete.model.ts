import { Table, Column, Model, DataType } from 'sequelize-typescript';

/**
 * Gabinete (tabla heredada `pumpes_gabinetes`): alimenta "Cumpleaños del mes".
 * `tipo`: 0 = Gobierno del Estado de México, 1 = Congreso del Estado de México.
 * `path`: foto, relativa a la carpeta de documentos ("images/gabinete/…", como en Laravel).
 */
@Table({
  tableName: 'pumpes_gabinetes',
  underscored: true,
  timestamps: true,
  paranoid: true,
})
export class PumpesGabinete extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare nombre: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare cargo: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare profesion: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare otros: string | null;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
    field: 'fecha_nacimiento',
  })
  declare fechaNacimiento: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare path: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare tipo: boolean;
}
