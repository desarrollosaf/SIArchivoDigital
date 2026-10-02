import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Prioridad del registro: 1 Ordinario, 2 Urgente (tabla heredada `tipo_atencions`). */
@Table({ tableName: 'tipo_atencions', underscored: true, timestamps: true })
export class TipoAtencion extends Model {
  @Column({
    type: DataType.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare tipo: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare status: boolean;
}

/** Medio por el que llegó la solicitud: oficio, vía telefónica (tabla `tipo_solicitud`). */
@Table({ tableName: 'tipo_solicitud', timestamps: false })
export class TipoSolicitud extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(50), allowNull: true })
  declare tipo: string | null;
}

/** Sede o salón donde ocurre un evento (tabla heredada `salones`). */
@Table({ tableName: 'salones', timestamps: false })
export class Salon extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare salon: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  declare color: string | null;
}

/** Modalidad de un evento: mixta, presencial, virtual (tabla heredada `modalidad`). */
@Table({ tableName: 'modalidad', timestamps: false })
export class Modalidad extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare modalidad: string | null;
}

/** Tipo de evento legislativo: sesión deliberante, comisión, comparecencia, otro (`tipo_evento`). */
@Table({ tableName: 'tipo_evento', timestamps: false })
export class TipoEvento extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare tipo: string | null;
}

/** Tipo de reunión de comisión (`tipo_reunion`). */
@Table({ tableName: 'tipo_reunion', timestamps: false })
export class TipoReunion extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(250), allowNull: true })
  declare tipo: string | null;
}
