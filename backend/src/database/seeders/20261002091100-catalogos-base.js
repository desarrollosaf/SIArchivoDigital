'use strict';

/**
 * Catálogos base tomados del respaldo de adminplem_archivoDigital. INSERT IGNORE por id: en la
 * base real (que ya los trae) no hace nada; en una base vacía deja el sistema utilizable.
 */
const CATALOGOS = {
  tipo_atencions: {
    columnas: ['id', 'tipo', 'status', 'created_at', 'updated_at'],
    filas: [
      [1, 'Ordinario', 1],
      [2, 'Urgente', 1],
    ],
    conFechas: true,
  },
  tipo_solicitud: {
    columnas: ['id', 'tipo'],
    filas: [
      [1, 'Por oficio'],
      [2, 'Vía telefonica'],
    ],
  },
  modalidad: {
    columnas: ['id', 'modalidad'],
    filas: [
      [1, 'Mixta'],
      [2, 'Presencial'],
      [3, 'Virtual'],
    ],
  },
  salones: {
    columnas: ['id', 'salon', 'color'],
    filas: [
      [1, 'Palacio Legislativo', '#468916'],
      [2, 'Salón "Benito Juárez"', '#893216'],
      [3, 'Sala de Juntas AMLO (Andres Manuel Lopez Obrador)', '#163589'],
      [4, 'Salón "Narciso Bassols"', '#985ab3'],
      [5, 'Unidad de Asistencia Social', '#5ab3ac'],
      [6, 'Biblioteca del Poder Legislativo (Patio)', '#a85f86'],
      [7, 'INESLE', '#a8845f'],
      [8, 'Vestíbulo', '#c6c888'],
      [9, 'Salón de Protocolos', '#79819c'],
      [10, 'Salón de Plenos "José María Morelos y Pavón"', '#96799c'],
      [11, 'Evento foráneo', '#aadbad'],
      [12, 'Salón anexo comedor', '#e59866'],
      [13, 'Comedor', '#00acff'],
      [14, 'Biblioteca del Poder Legislativo (Sala multimedia)', '#F54927'],
      [15, 'Biblioteca del Poder Legislativo (Auditorio)', '#F59827'],
      [16, 'N/A', '#000000'],
      [17, 'INESLE SALÓN', '#a8845f'],
    ],
  },
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    for (const [tabla, { columnas, filas, conFechas }] of Object.entries(
      CATALOGOS,
    )) {
      for (const fila of filas) {
        const valores = conFechas ? [...fila, now, now] : fila;
        const marcadores = valores.map(() => '?').join(', ');
        await queryInterface.sequelize.query(
          `INSERT IGNORE INTO \`${tabla}\` (${columnas.map((c) => `\`${c}\``).join(', ')}) VALUES (${marcadores})`,
          { replacements: valores },
        );
      }
    }
  },

  // No se borran: en la base real estos registros pertenecen al histórico de Laravel.
  async down() {},
};
