#!/bin/sh
# Lo ejecuta MariaDB la primera vez que arranca (docker-entrypoint-initdb.d). Restaura en
# adminplem_saf y adminplem_congresoedomex los respaldos montados (SAF_DUMP y LEGISLATIVO_DUMP)
# o, si no se indicaron, las bases de prueba de esta carpeta.
set -e
mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e \
  "CREATE DATABASE IF NOT EXISTS adminplem_saf CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" adminplem_saf < /docker-entrypoint-initdb.d/saf/saf.sql

# Base del Legislativo (catálogo de comisiones): respaldo real (LEGISLATIVO_DUMP) o de prueba.
mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e \
  "CREATE DATABASE IF NOT EXISTS adminplem_congresoedomex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" adminplem_congresoedomex < /docker-entrypoint-initdb.d/legislativo/legislativo.sql

# Una restauración recién hecha deja las tablas sin estadísticas y MariaDB deja de usar los
# índices (la agenda tardaba 4 s en vez de 30 ms). Se calculan al terminar la carga.
mariadb-check -uroot -p"$MARIADB_ROOT_PASSWORD" --analyze --databases adminplem_archivoDigital adminplem_saf adminplem_congresoedomex > /dev/null
