'use strict';

/**
 * Tabla heredada de Laravel con el gabinete (nombre, cargo y fecha de nacimiento) que alimenta
 * "Cumpleaños del mes". IF NOT EXISTS: en la base real ya existe con datos.
 * `tipo`: 0 = Gobierno del Estado de México, 1 = Congreso del Estado de México.
 */
const TABLA = `CREATE TABLE IF NOT EXISTS \`pumpes_gabinetes\` (
  \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(255) DEFAULT NULL,
  \`cargo\` varchar(255) DEFAULT NULL,
  \`profesion\` varchar(255) DEFAULT NULL,
  \`otros\` varchar(255) DEFAULT NULL,
  \`fecha_nacimiento\` date DEFAULT NULL,
  \`path\` varchar(255) DEFAULT NULL,
  \`tipo\` tinyint(1) NOT NULL DEFAULT 0,
  \`created_at\` timestamp NULL DEFAULT NULL,
  \`updated_at\` timestamp NULL DEFAULT NULL,
  \`deleted_at\` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(TABLA);
  },

  // La tabla guarda datos capturados en Laravel: no se borra.
  async down() {},
};
