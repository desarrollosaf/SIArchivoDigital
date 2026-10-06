#!/usr/bin/env node
'use strict';

/**
 * Revisa que los archivos que la base dice tener existan en el disco, con la misma estructura del
 * storage de Laravel:
 *   UPLOADS_DIR         = storage/app         (registros/, comentarios/, Conclusion/…)
 *   UPLOADS_PUBLIC_DIR  = storage/app/public  (images/gabinete/, fotos/…)
 *
 * Uso (en el servidor):
 *   docker compose -f docker-compose.prod.yml exec backend npm run verificar-archivos
 *
 * Solo lee: no modifica la base ni los archivos.
 */
const { existsSync, readdirSync } = require('fs');
const { join, resolve } = require('path');
const mysql = require('mysql2/promise');

try {
  require('dotenv').config({ path: join(__dirname, '..', '.env') });
} catch {
  // En Docker las variables ya vienen de env_file.
}

const SIN_ARCHIVO = new Set(['', 'nofile', 'notfile']);
const DOCUMENTOS = resolve(process.env.UPLOADS_DIR?.trim() || join(__dirname, '..', 'uploads'));
const PUBLICO = resolve(process.env.UPLOADS_PUBLIC_DIR?.trim() || join(DOCUMENTOS, 'public'));

async function conectar(prefijo, base) {
  return mysql.createConnection({
    host: process.env[`${prefijo}_HOST`],
    port: Number(process.env[`${prefijo}_PORT`] || 3306),
    user: process.env[`${prefijo}_USERNAME`],
    password: process.env[`${prefijo}_PASSWORD`],
    database: process.env[`${prefijo}_DATABASE`] || base,
  });
}

function contenido(dir) {
  try {
    return readdirSync(dir).slice(0, 15).join(', ') || '(vacía)';
  } catch {
    return '(no existe o no se puede leer)';
  }
}

function revisar(titulo, rutas, raices) {
  const validas = rutas.filter((r) => r && !SIN_ARCHIVO.has(r));
  const faltan = validas.filter((r) => !raices.some((raiz) => existsSync(join(raiz, r))));
  const ok = validas.length - faltan.length;
  const marca = faltan.length === 0 ? 'OK ' : ok === 0 ? 'XX ' : '!! ';
  console.log(`${marca} ${titulo}: ${ok} de ${validas.length} encontrados`);
  for (const r of faltan.slice(0, 5)) console.log(`      falta: ${r}`);
  if (faltan.length > 5) console.log(`      … y ${faltan.length - 5} más`);
  return { total: validas.length, ok };
}

async function main() {
  console.log(`Documentos (storage/app):         ${DOCUMENTOS}`);
  console.log(`  contiene: ${contenido(DOCUMENTOS)}`);
  console.log(`Públicos (storage/app/public):    ${PUBLICO}`);
  console.log(`  contiene: ${contenido(PUBLICO)}`);
  console.log('');

  // Pistas si el montaje quedó un nivel arriba (se montó "storage" o el proyecto Laravel completo).
  for (const sub of ['app', 'storage/app']) {
    if (existsSync(join(DOCUMENTOS, sub, 'registros'))) {
      console.log(
        `AVISO: los documentos están en ${join(DOCUMENTOS, sub)}. ` +
          `Pon UPLOADS_DIR=/app/uploads/${sub} en backend/.env (o monta esa carpeta) y reinicia.\n`,
      );
    }
  }

  const archivo = await conectar('DB', 'adminplem_archivoDigital');
  const col = async (sql) => (await archivo.query(sql))[0].map((f) => f.r);
  const resultados = [
    revisar('Documentos de registros', await col('SELECT path AS r FROM registro'), [DOCUMENTOS]),
    revisar(
      'Conclusiones de turnos',
      await col('SELECT file_conclusion AS r FROM registro_atencions WHERE file_conclusion IS NOT NULL'),
      [DOCUMENTOS],
    ),
    revisar(
      'Archivos de comentarios',
      await col('SELECT file_path AS r FROM comments WHERE file_path IS NOT NULL'),
      [DOCUMENTOS],
    ),
    revisar(
      'Archivos de respuestas',
      await col('SELECT file_path AS r FROM answers WHERE file_path IS NOT NULL'),
      [DOCUMENTOS],
    ),
    revisar(
      'Fotos del gabinete',
      await col('SELECT path AS r FROM pumpes_gabinetes WHERE deleted_at IS NULL AND path IS NOT NULL'),
      [PUBLICO, DOCUMENTOS],
    ),
  ];
  await archivo.end();

  const saf = await conectar('DB_EXTERNAL', 'adminplem_saf');
  const [fotos] = await saf.query(
    "SELECT path_foto AS r FROM users_safs WHERE deleted_at IS NULL AND path_foto IS NOT NULL AND path_foto <> ''",
  );
  resultados.push(revisar('Fotos de perfil', fotos.map((f) => f.r), [PUBLICO, DOCUMENTOS]));
  await saf.end();

  const total = resultados.reduce((s, r) => s + r.total, 0);
  const ok = resultados.reduce((s, r) => s + r.ok, 0);
  console.log(`\nTotal: ${ok} de ${total} archivos encontrados.`);
}

main().catch((e) => {
  console.error('No se pudo completar la revisión:', e.message);
  process.exit(1);
});
