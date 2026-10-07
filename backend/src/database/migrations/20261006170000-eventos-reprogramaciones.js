'use strict';

/**
 * Historial de reprogramaciones de eventos legislativos: cada vez que un evento cambia de fecha
 * (p. ej. por un oficio que informa la REPROGRAMACIÓN) se guarda cuándo y dónde era antes, el
 * motivo y quién lo hizo. Así la agenda del día original indica a qué fecha pasó.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`eventos_reprogramaciones\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`registroP_id\` int(11) NOT NULL,
        \`fecha_anterior\` date NOT NULL,
        \`fecha_fin_anterior\` date DEFAULT NULL,
        \`hora_inicio_anterior\` time DEFAULT NULL,
        \`hora_termino_anterior\` time DEFAULT NULL,
        \`sede_anterior\` int(11) DEFAULT NULL,
        \`fecha_nueva\` date NOT NULL,
        \`motivo\` varchar(1000) NOT NULL,
        \`user_rfc\` varchar(20) DEFAULT NULL,
        \`created_at\` timestamp NULL DEFAULT NULL,
        \`updated_at\` timestamp NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`eventos_reprogramaciones_evento\` (\`registroP_id\`),
        KEY \`eventos_reprogramaciones_fecha\` (\`fecha_anterior\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('eventos_reprogramaciones');
  },
};
