'use strict';

/**
 * Personas a las que un usuario puede turnar aunque la regla general (área y rango) no las
 * incluya. En Laravel eran excepciones fijas por RFC en RegistroController@index/getDestinatario
 * y BusquedasController@turnar; aquí se cargan esas mismas y se administran en la base.
 */
const EXCEPCIONES_LARAVEL = [
  ['MAVM780223', 'PAGA841220'],
  ['MAVM780223', 'ROGA700202'],
  ['GUJJ710706', 'ROTV850624'],
  ['GOVW780501', 'LUDL690726'],
  ['SECA800424', 'MIGL730309'],
  ['SECA800424', 'DOMJ630106'],
  ['SECA800424', 'HULV750429'],
  ['SECA800424', 'DAHL761001'],
  ['SECA800424', 'HEVJ670709'],
  ['SECA800424', 'BOCJ850804'],
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`destinatarios_adicionales\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`rfc_usuario\` varchar(20) NOT NULL,
        \`rfc_destinatario\` varchar(20) NOT NULL,
        \`created_at\` timestamp NULL DEFAULT NULL,
        \`updated_at\` timestamp NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`destinatarios_adicionales_par\` (\`rfc_usuario\`, \`rfc_destinatario\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await queryInterface.sequelize.query(
      'INSERT IGNORE INTO `destinatarios_adicionales` ' +
        '(`rfc_usuario`, `rfc_destinatario`, `created_at`, `updated_at`) VALUES ' +
        EXCEPCIONES_LARAVEL.map(() => '(?, ?, NOW(), NOW())').join(', '),
      { replacements: EXCEPCIONES_LARAVEL.flat() },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('destinatarios_adicionales');
  },
};
