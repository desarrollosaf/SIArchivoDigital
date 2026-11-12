'use strict';

/**
 * Índices para la búsqueda de folios paginada en el servidor: filtrar por remitente y ordenar por
 * fecha de creación sin recorrer toda la tabla. Solo agregan índices (seguros sobre la base que
 * comparte el sistema Laravel). Si el índice ya existe se omite.
 */
const INDICES = [
  {
    tabla: 'registro',
    nombre: 'registro_remitente_rfc_created_at_index',
    campos: ['remitente_rfc', 'created_at'],
  },
  {
    tabla: 'registro',
    nombre: 'registro_created_at_index',
    campos: ['created_at'],
  },
];

async function existeIndice(queryInterface, tabla, nombre) {
  const indices = await queryInterface.showIndex(tabla);
  return indices.some((i) => i.name === nombre);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const { tabla, nombre, campos } of INDICES) {
      if (!(await existeIndice(queryInterface, tabla, nombre))) {
        await queryInterface.addIndex(tabla, campos, { name: nombre });
      }
    }
  },

  async down(queryInterface) {
    for (const { tabla, nombre } of INDICES) {
      if (await existeIndice(queryInterface, tabla, nombre)) {
        await queryInterface.removeIndex(tabla, nombre);
      }
    }
  },
};
