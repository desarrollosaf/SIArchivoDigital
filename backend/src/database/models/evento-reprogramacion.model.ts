import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Una reprogramación de un evento legislativo: dónde y cuándo era antes, y por qué cambió. */
@Table({
  tableName: 'eventos_reprogramaciones',
  underscored: true,
  timestamps: true,
})
export class EventoReprogramacion extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.INTEGER, allowNull: false, field: 'registroP_id' })
  declare registroPId: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
    field: 'fecha_anterior',
  })
  declare fechaAnterior: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
    field: 'fecha_fin_anterior',
  })
  declare fechaFinAnterior: string | null;

  @Column({
    type: DataType.TIME,
    allowNull: true,
    field: 'hora_inicio_anterior',
  })
  declare horaInicioAnterior: string | null;

  @Column({
    type: DataType.TIME,
    allowNull: true,
    field: 'hora_termino_anterior',
  })
  declare horaTerminoAnterior: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'sede_anterior' })
  declare sedeAnterior: number | null;

  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'fecha_nueva' })
  declare fechaNueva: string;

  @Column({ type: DataType.STRING(1000), allowNull: false })
  declare motivo: string;

  @Column({ type: DataType.STRING(20), allowNull: true, field: 'user_rfc' })
  declare userRfc: string | null;

  declare createdAt: Date;
}
