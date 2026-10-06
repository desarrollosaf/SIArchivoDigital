'use strict';

/**
 * Teléfonos que reciben por WhatsApp los avisos de cumpleaños (del día y el PDF del mes). En
 * Laravel estaban fijos en el código (CumpleTask, CumplePdfEmail); aquí los administra el
 * administrador desde Administración → Avisos por WhatsApp.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`whatsapp_destinatarios\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`nombre\` varchar(150) NOT NULL,
        \`telefono\` varchar(10) NOT NULL,
        \`activo\` tinyint(1) NOT NULL DEFAULT 1,
        \`created_at\` timestamp NULL DEFAULT NULL,
        \`updated_at\` timestamp NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`whatsapp_destinatarios_telefono\` (\`telefono\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('whatsapp_destinatarios');
  },
};
