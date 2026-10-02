'use strict';

/**
 * Esquema heredado de Archivo Digital (Laravel). En producción estas tablas YA existen con
 * datos (se restauran del respaldo adminplem_archivoDigital), por eso todo es
 * CREATE TABLE IF NOT EXISTS: en una base vacía arma el esquema, en la real no toca nada.
 *
 * Las definiciones son las del respaldo de la base, sin cambios, para que Laravel y
 * SIArchivoDigital puedan compartir la misma base durante la transición.
 */
const TABLAS = [
  `CREATE TABLE IF NOT EXISTS \`tipo_atencions\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`tipo\` varchar(255) NOT NULL,
    \`status\` tinyint(1) NOT NULL DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`tipo_solicitud\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`tipo\` varchar(50) DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`salones\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`salon\` varchar(250) DEFAULT NULL,
    \`color\` varchar(20) DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`modalidad\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`modalidad\` varchar(250) DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`secciones\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`codigo\` varchar(255) NOT NULL,
    \`seccion\` varchar(255) NOT NULL,
    \`departamento_id\` varchar(255) NOT NULL,
    \`status\` tinyint(1) NOT NULL DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`series\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`idSeccion\` int(11) NOT NULL,
    \`codigo\` varchar(255) NOT NULL,
    \`serie\` varchar(255) NOT NULL,
    \`departamento_id\` int(11) NOT NULL,
    \`horarios\` tinyint(1) NOT NULL DEFAULT 1,
    \`status\` tinyint(1) NOT NULL DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    \`duracionSistema\` int(11) DEFAULT 730,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`sub_series\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`codigo\` varchar(255) NOT NULL,
    \`subserie\` varchar(255) NOT NULL,
    \`serie\` int(11) DEFAULT NULL,
    \`idSerie\` int(11) NOT NULL,
    \`status\` tinyint(1) NOT NULL DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`folios\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`id_departamento\` int(11) DEFAULT NULL,
    \`folio\` int(11) NOT NULL DEFAULT 0,
    \`uAdmin\` int(11) NOT NULL DEFAULT 0,
    \`anio\` int(11) NOT NULL DEFAULT 0,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`groups\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`grupo\` varchar(255) NOT NULL,
    \`activo\` tinyint(1) NOT NULL DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`members\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`id_group\` varchar(255) NOT NULL,
    \`user_rfc\` varchar(255) NOT NULL,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`us_lecturas\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`user_rfc\` varchar(255) NOT NULL,
    \`rfc_jefe\` varchar(255) DEFAULT NULL,
    \`id_jefe\` int(11) DEFAULT NULL,
    \`status\` tinyint(1) NOT NULL DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`registro\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`folio\` varchar(255) NOT NULL,
    \`folio_rastreo\` int(11) DEFAULT NULL,
    \`fecha_recepcion\` date NOT NULL,
    \`fecha_documento\` date DEFAULT NULL,
    \`referencia_documento\` varchar(255) DEFAULT NULL,
    \`fecha_limite_atencion\` date NOT NULL,
    \`hora_atencion\` time DEFAULT NULL,
    \`tipo_atencion\` int(11) NOT NULL,
    \`serie_id\` int(11) NOT NULL,
    \`titulo_doc\` longtext NOT NULL,
    \`descripcion_doc\` longtext NOT NULL,
    \`path\` longtext NOT NULL,
    \`user_registro\` int(11) NOT NULL,
    \`remitente_rfc\` varchar(255) NOT NULL,
    \`otro_remitente\` varchar(255) DEFAULT NULL,
    \`fojas\` int(11) DEFAULT NULL,
    \`hora_termino\` time DEFAULT NULL,
    \`tipo_solicitud\` int(11) DEFAULT NULL,
    \`salon\` int(11) DEFAULT NULL,
    \`status\` tinyint(1) NOT NULL DEFAULT 1,
    \`activo\` tinyint(1) NOT NULL DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    \`otraSerie\` varchar(500) DEFAULT NULL,
    \`nombre_evento\` longtext DEFAULT NULL,
    \`destinatario_otro\` text DEFAULT NULL,
    \`destinatario\` varchar(10) DEFAULT NULL,
    \`tipo_correspondencia\` int(11) DEFAULT NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`registro_atencions\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`registro_id\` bigint(20) unsigned NOT NULL,
    \`user_rfc\` varchar(255) NOT NULL,
    \`visto\` tinyint(1) NOT NULL DEFAULT 0,
    \`statusAtencion\` tinyint(1) NOT NULL DEFAULT 0,
    \`tipoAtencion\` varchar(255) NOT NULL,
    \`indicaciones_turno\` longtext DEFAULT NULL,
    \`file_conclusion\` varchar(255) DEFAULT NULL,
    \`comentario_conclusion\` varchar(255) DEFAULT NULL,
    \`user_turna\` varchar(255) DEFAULT NULL,
    \`activo\` tinyint(1) NOT NULL DEFAULT 1,
    \`notificacion\` tinyint(1) NOT NULL DEFAULT 1,
    \`seccion_id\` int(11) DEFAULT NULL,
    \`serie_id\` int(11) DEFAULT NULL,
    \`subserie_id\` int(11) DEFAULT NULL,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    \`user_rfc_anterior\` varchar(10) DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`registro_atencions_registro_id_foreign\` (\`registro_id\`),
    CONSTRAINT \`registro_atencions_registro_id_foreign\` FOREIGN KEY (\`registro_id\`) REFERENCES \`registro\` (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`comments\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`reg_id\` bigint(20) unsigned DEFAULT NULL,
    \`user_rfc\` varchar(255) NOT NULL,
    \`comment\` longtext DEFAULT NULL,
    \`comment_to\` longtext DEFAULT NULL,
    \`file_path\` varchar(255) DEFAULT NULL,
    \`status\` varchar(255) DEFAULT NULL,
    \`notificacion\` tinyint(1) NOT NULL DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`comments_reg_id_foreign\` (\`reg_id\`),
    CONSTRAINT \`comments_reg_id_foreign\` FOREIGN KEY (\`reg_id\`) REFERENCES \`registro\` (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`answers\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`reg_id\` bigint(20) unsigned DEFAULT NULL,
    \`id_comment\` bigint(20) unsigned DEFAULT NULL,
    \`user_rfc\` varchar(255) NOT NULL,
    \`comment\` longtext DEFAULT NULL,
    \`file_path\` varchar(255) DEFAULT NULL,
    \`status\` varchar(255) DEFAULT NULL,
    \`notificacion\` tinyint(1) NOT NULL DEFAULT 1,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`answers_id_comment_foreign\` (\`id_comment\`),
    CONSTRAINT \`answers_id_comment_foreign\` FOREIGN KEY (\`id_comment\`) REFERENCES \`comments\` (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`agendas\` (
    \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    \`registro_id\` bigint(20) unsigned DEFAULT NULL,
    \`title\` varchar(255) NOT NULL,
    \`descripcion\` longtext NOT NULL,
    \`start\` datetime NOT NULL,
    \`end\` datetime NOT NULL,
    \`empieza\` varchar(255) NOT NULL,
    \`termina\` varchar(255) NOT NULL,
    \`hora\` varchar(255) DEFAULT NULL,
    \`color\` varchar(255) NOT NULL,
    \`status\` tinyint(1) NOT NULL,
    \`created_at\` timestamp NULL DEFAULT NULL,
    \`updated_at\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`agendas_registro_id_foreign\` (\`registro_id\`),
    CONSTRAINT \`agendas_registro_id_foreign\` FOREIGN KEY (\`registro_id\`) REFERENCES \`registro\` (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const sql of TABLAS) {
      await queryInterface.sequelize.query(sql);
    }
  },

  // Intencionalmente vacío: revertir no debe borrar las tablas heredadas, que guardan el
  // histórico real del sistema Laravel.
  async down() {},
};
