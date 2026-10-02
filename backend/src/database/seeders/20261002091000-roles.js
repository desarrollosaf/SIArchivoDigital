'use strict';

const ROLES = [
  { clave: 'administrador', nombre: 'Administrador' },
  { clave: 'usuario', nombre: 'Usuario' },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    // INSERT ... WHERE NOT EXISTS para que sea seguro correrlo más de una vez.
    for (const rol of ROLES) {
      await queryInterface.sequelize.query(
        'INSERT INTO roles (clave, nombre, created_at, updated_at) ' +
          'SELECT :clave, :nombre, :now, :now FROM DUAL ' +
          'WHERE NOT EXISTS (SELECT 1 FROM roles WHERE clave = :clave)',
        { replacements: { ...rol, now } },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', {
      clave: ROLES.map((r) => r.clave),
    });
  },
};
