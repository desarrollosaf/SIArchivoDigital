'use strict';

/**
 * Índices para las consultas de bandejas y notificaciones, que en Laravel filtraban por RFC o
 * por usuario sin índice. Solo agregan índices (no cambian columnas ni datos), así que son
 * seguros sobre la base que comparte el sistema Laravel. Si el índice ya existe se omite.
 */
const INDICES = [
  {
    tabla: 'registro_atencions',
    nombre: 'registro_atencions_user_rfc_index',
    campos: ['user_rfc', 'statusAtencion'],
  },
  {
    tabla: 'registro',
    nombre: 'registro_user_registro_index',
    campos: ['user_registro', 'created_at'],
  },
  { tabla: 'registro', nombre: 'registro_folio_index', campos: ['folio'] },
  { tabla: 'agendas', nombre: 'agendas_start_index', campos: ['start'] },
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
