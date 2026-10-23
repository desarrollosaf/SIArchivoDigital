import { Table, Column, Model, DataType } from 'sequelize-typescript';

/**
 * Excepción a la regla de destinatarios: `rfc_usuario` puede turnar también a
 * `rfc_destinatario` (en Laravel eran RFC fijos en el código). Se administra en la base.
 */
@Table({
  tableName: 'destinatarios_adicionales',
  underscored: true,
  timestamps: true,
})
export class DestinatarioAdicional extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(20), allowNull: false, field: 'rfc_usuario' })
  declare rfcUsuario: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    field: 'rfc_destinatario',
  })
  declare rfcDestinatario: string;
}
