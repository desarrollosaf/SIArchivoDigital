'use strict';

/**
 * Eventos legislativos de varios días (p. ej. una visita guiada de lunes a viernes de 9 a 17):
 * `fecha_fin` es el último día; si es NULL el evento es de un solo día (`fecha_evento`), como
 * siempre. Cada día del rango aparece en la agenda y ocupa la sede en ese horario. Laravel no
 * conoce la columna, así que no le afecta.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columnas = await queryInterface.describeTable('registro_presidencia');
    if (!columnas.fecha_fin) {
      await queryInterface.addColumn('registro_presidencia', 'fecha_fin', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        after: 'fecha_evento',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('registro_presidencia', 'fecha_fin');
  },
};
