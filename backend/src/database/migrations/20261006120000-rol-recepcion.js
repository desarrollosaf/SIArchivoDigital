'use strict';

/**
 * Rol "recepcion" (Recepción de Presidencia). En Laravel el RFC GAJC730614 tenía fijo en el código
 * que al registrar capturaba "Tipo de correspondencia" y "Dirigido a"; ahora lo da este rol, que se
 * puede asignar a otra persona desde Administración → Roles. Si esa persona ya tiene otro rol,
 * no se le cambia.
 */
const RFCS_RECEPCION = ['GAJC730614'];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.sequelize.query(
      'INSERT INTO roles (clave, nombre, created_at, updated_at) ' +
        "SELECT 'recepcion', 'Recepción de Presidencia', :now, :now FROM DUAL " +
        "WHERE NOT EXISTS (SELECT 1 FROM roles WHERE clave = 'recepcion')",
      { replacements: { now } },
    );
    for (const rfc of RFCS_RECEPCION) {
      await queryInterface.sequelize.query(
        'INSERT INTO usuario_roles (rfc, rol_id, created_at, updated_at) ' +
          "SELECT :rfc, id, :now, :now FROM roles WHERE clave = 'recepcion' " +
          'AND NOT EXISTS (SELECT 1 FROM usuario_roles WHERE rfc = :rfc)',
        { replacements: { rfc, now } },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE FROM usuario_roles WHERE rol_id = (SELECT id FROM roles WHERE clave = 'recepcion')",
    );
    await queryInterface.bulkDelete('roles', { clave: 'recepcion' });
  },
};
