'use strict';

/**
 * Agenda de Presidencia.
 *
 * 1. Tablas heredadas de Laravel que la alimentan (IF NOT EXISTS: en la base real ya existen).
 * 2. Rol "presidencia", que reemplaza la lista de RFC fija del menú de Laravel, asignado a quienes
 *    hoy la ven y siguen activos. Si alguien ya tiene otro rol, no se le cambia.
 */
const TABLAS = [
  `CREATE TABLE IF NOT EXISTS \`agenda_presidencia\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`registro_id\` int(11) DEFAULT NULL,
    \`registroP_id\` int(11) DEFAULT NULL,
    \`title\` longtext DEFAULT NULL,
    \`descipcion\` longtext DEFAULT NULL,
    \`start\` timestamp NULL DEFAULT NULL,
    \`end\` timestamp NULL DEFAULT NULL,
    \`empieza\` date DEFAULT NULL,
    \`termina\` date DEFAULT NULL,
    \`status\` int(11) DEFAULT 1,
    \`fecha_id\` int(11) DEFAULT NULL,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`registro_presidencia\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`fecha_evento\` date DEFAULT NULL,
    \`hora_inicio\` time DEFAULT NULL,
    \`hora_termino\` time DEFAULT NULL,
    \`tipo_evento\` int(11) DEFAULT NULL,
    \`sede\` int(11) DEFAULT NULL,
    \`user_registro\` varchar(10) DEFAULT NULL,
    \`STATUS\` int(11) DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    \`materia\` longtext DEFAULT NULL,
    \`tipo_reunion\` int(11) DEFAULT NULL,
    \`modalidad\` int(11) DEFAULT NULL,
    \`nombre_evento\` longtext DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`comision_registro\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`id_registroP\` int(11) DEFAULT NULL,
    \`id_comision\` longtext DEFAULT NULL,
    \`STATUS\` int(11) DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`tipo_evento\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`tipo\` varchar(250) DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`tipo_reunion\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`tipo\` varchar(250) DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

/** Quienes veían la Agenda de Presidencia en el menú de Laravel y siguen activos. */
const RFCS_PRESIDENCIA = [
  'SECA800424',
  'LOFR830807',
  'MALH711101',
  'DIRG940621',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const sql of TABLAS) {
      await queryInterface.sequelize.query(sql);
    }

    const now = new Date();
    await queryInterface.sequelize.query(
      'INSERT INTO roles (clave, nombre, created_at, updated_at) ' +
        "SELECT 'presidencia', 'Presidencia', :now, :now FROM DUAL " +
        "WHERE NOT EXISTS (SELECT 1 FROM roles WHERE clave = 'presidencia')",
      { replacements: { now } },
    );
    for (const rfc of RFCS_PRESIDENCIA) {
      await queryInterface.sequelize.query(
        'INSERT INTO usuario_roles (rfc, rol_id, created_at, updated_at) ' +
          "SELECT :rfc, id, :now, :now FROM roles WHERE clave = 'presidencia' " +
          'AND NOT EXISTS (SELECT 1 FROM usuario_roles WHERE rfc = :rfc)',
        { replacements: { rfc, now } },
      );
    }
  },

  // Solo quita el rol; las tablas heredadas guardan el histórico de Laravel y no se borran.
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE FROM usuario_roles WHERE rol_id = (SELECT id FROM roles WHERE clave = 'presidencia')",
    );
    await queryInterface.bulkDelete('roles', { clave: 'presidencia' });
  },
};
