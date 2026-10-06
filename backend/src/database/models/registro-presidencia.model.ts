import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';

export const TIPO_EVENTO_SESION = 1;
export const TIPO_EVENTO_COMISION = 2;
export const TIPO_EVENTO_COMPARECENCIA = 3;
export const TIPO_EVENTO_OTRO = 4;

/** Comisión que participa en un evento legislativo (tabla heredada `comision_registro`). */
@Table({ tableName: 'comision_registro', timestamps: true, underscored: true })
export class ComisionRegistro extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'id_registroP' })
  declare idRegistroP: number;

  /** UUID de adminplem_congresoedomex.comisions. */
  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
    field: 'id_comision',
  })
  declare idComision: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 1,
    field: 'STATUS',
  })
  declare status: number;
}

/**
 * Evento legislativo capturado por Presidencia (tabla heredada `registro_presidencia`). Cada uno
 * tiene su entrada en `agenda_presidencia` (registroP_id).
 */
@Table({
  tableName: 'registro_presidencia',
  timestamps: true,
  underscored: true,
})
export class RegistroPresidencia extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'fecha_evento' })
  declare fechaEvento: string;

  /** Último día de un evento de varios días; null = solo `fechaEvento`. */
  @Column({ type: DataType.DATEONLY, allowNull: true, field: 'fecha_fin' })
  declare fechaFin: string | null;

  @Column({ type: DataType.TIME, allowNull: true, field: 'hora_inicio' })
  declare horaInicio: string;

  @Column({ type: DataType.TIME, allowNull: true, field: 'hora_termino' })
  declare horaTermino: string;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'tipo_evento' })
  declare tipoEvento: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare sede: number;

  /** RFC de quien lo capturó. */
  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    field: 'user_registro',
  })
  declare userRegistro: string | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 1,
    field: 'STATUS',
  })
  declare status: number;

  @Column({ type: DataType.TEXT('long'), allowNull: true })
  declare materia: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'tipo_reunion' })
  declare tipoReunion: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare modalidad: number | null;

  @Column({
    type: DataType.TEXT('long'),
    allowNull: true,
    field: 'nombre_evento',
  })
  declare nombreEvento: string | null;

  @HasMany(() => ComisionRegistro, {
    foreignKey: 'idRegistroP',
    as: 'comisiones',
    constraints: false,
  })
  declare comisiones: ComisionRegistro[];
}
