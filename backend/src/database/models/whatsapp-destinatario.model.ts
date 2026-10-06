import { Table, Column, Model, DataType } from 'sequelize-typescript';

/** Teléfono que recibe los avisos de cumpleaños por WhatsApp (10 dígitos, sin +52). */
@Table({
  tableName: 'whatsapp_destinatarios',
  underscored: true,
  timestamps: true,
})
export class WhatsappDestinatario extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare nombre: string;

  @Column({ type: DataType.STRING(10), allowNull: false, unique: true })
  declare telefono: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare activo: boolean;
}
