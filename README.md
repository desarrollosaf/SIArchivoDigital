# SIArchivoDigital

Nueva versión de **Archivo Digital** (control de correspondencia y documentación de la SAF),
reescrita en **Angular 22 + NestJS 11** con la misma arquitectura que SIPresupuesto. Reemplaza al
sistema Laravel `archivodigital` y **usa la misma base de datos** (`adminplem_archivoDigital`), así
que ambos pueden convivir durante la transición.

## Qué hace

| Módulo | Descripción |
| --- | --- |
| Registro de documentos | Captura de oficios con folio consecutivo por área y año (`{c_presup}/{n}/{año}`), archivo escaneado, remitente interno o externo, serie, prioridad y fecha límite. |
| Turnos | Envío a personas o **grupos** para su *atención* (A) o *conocimiento* (C). Quien recibe puede volver a turnar, concluir con comentario/archivo y clasificar (sección → serie → subserie). |
| Bandeja de entrada | Turnos recibidos, pendientes y atendidos, con plazo y vencimiento. |
| Bandeja de salida | Documentos registrados por el usuario y el avance de sus turnos. |
| Detalle del documento | Datos, turnos, comentarios y respuestas con adjuntos; editar, cancelar, turnar y concluir. |
| Notificaciones | Campana con turnos nuevos, comentarios dirigidos al usuario y respuestas a sus comentarios. |
| Agenda | Calendario mensual con las fechas límite de atención. |
| Búsqueda | Por folio, referencia, asunto, indicaciones o nombre del remitente. |
| Archivo de concentración | Documentos que ya cumplieron su plazo en archivo de trámite (según la serie; 730 días por omisión). |
| Reportes | Totales del periodo, turnos pendientes por persona y concentrado en Excel. |
| Agenda de Presidencia | Calendario legislativo (rol `presidencia`): documentos de la serie EVENTOS y eventos legislativos, filtro por sede, detalle y reportes "Agenda general" / "Agenda comisiones" para imprimir. |
| Eventos legislativos | Captura de sesiones, comisiones y comparecencias (rol `presidencia`) con las reglas del formulario de Laravel por tipo de evento, revisión de sede ocupada y comisiones del Legislativo. |
| Administración | Cuadro de clasificación archivística, grupos de destinatarios y roles de usuario. |

## Arquitectura

```
SIArchivoDigital/
├── src/                      Frontend Angular 22 (standalone + signals, ag-grid, Bootstrap 5)
│   ├── app/core/             Servicios HTTP, guards e interceptor (JWT)
│   ├── app/layout/shell/     Barra superior, menú por rol, campana y cierre por inactividad
│   ├── app/shared/           Componentes reutilizables (selector de personas, modal, ag-grid…)
│   ├── app/features/         Una carpeta por pantalla
│   └── styles.scss           Paleta institucional y piezas comunes de las pantallas
└── backend/                  API NestJS 11 + Sequelize
    └── src/
        ├── auth/, roles/     Login contra adminplem_saf.users_safs y roles propios (igual que SIPresupuesto)
        ├── common/           Archivos, padrón SAF, control de acceso, agenda y estatus de registros
        ├── database/         Modelos, migraciones y seeders (sequelize-cli)
        ├── catalogos/        Series, secciones, tipos, salones, destinatarios…
        ├── registros/        Captura, edición, cancelación, búsqueda y detalle
        ├── turnos/           Bandeja de entrada, turnar, concluir y quitar turnos
        ├── comentarios/      Comentarios y respuestas con adjuntos
        ├── notificaciones/   Campana
        ├── agenda/, concentracion/, reportes/
        └── clasificacion/, grupos/   Administración (rol administrador)
```

### Bases de datos

| Conexión | Base | Uso |
| --- | --- | --- |
| `default` | `adminplem_archivoDigital` | Tablas heredadas de Laravel (`registro`, `registro_atencions`, `comments`, `answers`, `agendas`, `folios`, `secciones`, `series`, `sub_series`, `groups`, `members`, `us_lecturas`…) más `roles` y `usuario_roles`. |
| `external` | `adminplem_saf` | Login (`users_safs`) y padrón (`s_usuario`, `s_users`, `t_departamento`…). Solo lectura. |
| `legislativo` | `adminplem_congresoedomex` | Catálogo de comisiones (`comisions`) de los eventos legislativos. Solo lectura. La base del Pleno que usaba Laravel ya no se usa. |

Particularidades del esquema heredado que conviene conocer:

| Tema | Detalle |
| --- | --- |
| Estatus | `registro.status` 1 = pendiente, 0 = concluido. `registro.activo` 0 = cancelado. |
| Turnos | `registro_atencions.tipoAtencion` `A` atención / `C` conocimiento; `statusAtencion` 0/1; `user_turna` = quien turnó (vacío si el turno nació con el registro). |
| Quién registró | `registro.user_registro` guarda `users_safs.id` (no el RFC). |
| Series especiales | `serie_id` 999 = CORRESPONDENCIA y 4161 = EVENTOS (Laravel escribía `010101`, un octal de PHP). No existen en `series`. |
| Sin archivo | Laravel guardaba `nofile` / `notfile` en lugar de NULL. |
| Lector delegado | `us_lecturas`: `user_rfc` ve las bandejas de `rfc_jefe` en solo lectura. Se administra directo en la base. |

## Puesta en marcha

### 1. Base de datos

En el servidor ya existe `adminplem_archivoDigital`. Para un ambiente local, restaura el respaldo:

```bash
mysql -u root -p -e "CREATE DATABASE adminplem_archivoDigital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root -p adminplem_archivoDigital < dump-adminplem_archivoDigital-AAAAMMDD.sql
```

> Los respaldos `.sql` traen datos personales: están en `.gitignore` y no deben subirse al repositorio.

Luego configura y migra:

```bash
cp backend/.env.example backend/.env   # captura credenciales de ambas bases y JWT_SECRET
cd backend
npm install
npm run migrate
npm run seed
```

Las migraciones son seguras sobre la base real:

- `create-legacy-schema` usa `CREATE TABLE IF NOT EXISTS`: no toca tablas existentes y su `down` no borra nada.
- `create-roles` / `create-usuario-roles` crean las tablas nuevas de roles.
- `add-indices-bandejas` solo agrega índices (por RFC del turno, usuario que registró, folio y fecha de agenda).
- Los seeders insertan roles y catálogos base solo si no existen.

Asigna el primer administrador (después se administran desde *Administración → Roles de usuario*):

```sql
INSERT INTO usuario_roles (rfc, rol_id, created_at, updated_at)
SELECT 'RFC_DEL_ADMIN', id, NOW(), NOW() FROM roles WHERE clave = 'administrador';
```

### 2. Documentos históricos

Los registros guardan rutas relativas como `registros/abc.pdf`, `Conclusion/xyz.pdf` o
`comentarios/...`. Copia el contenido de `storage/app` del Laravel a `backend/uploads` (o apunta
`UPLOADS_DIR` a esa carpeta) para que los documentos anteriores sigan abriendo.

Los archivos **no** se publican como estáticos: se entregan por la API después de validar que el
usuario capturó el registro, tiene un turno en él o es administrador.

### 3. Desarrollo

Con npm (backend en el puerto de `PORT`, por defecto 3060):

```bash
cd backend && npm run start:dev
# en otra terminal, desde la raíz
npm install
npm start            # http://localhost:4200, /api se redirige al backend (proxy.conf.js)
```

Con Docker: `docker compose up` (frontend en http://localhost:4250, API en el puerto 3095).

Ambiente local completo, con su propia base de datos. Restaura el respaldo de Archivo Digital y
el de `adminplem_saf` (con él se entra con las mismas contraseñas de producción). Si no se indica
`SAF_DUMP`, crea un `adminplem_saf` de prueba con usuarios ficticios, contraseña `prueba123`
(`backend/scripts/saf-prueba.sql`):

```bash
ARCHIVO_DUMP=/ruta/al/dump-adminplem_archivoDigital.sql \
SAF_DUMP=/ruta/al/dump-adminplem_saf.sql \
LEGISLATIVO_DUMP=/ruta/al/dump-adminplem_congresoedomex.sql \
  docker compose -p siarchivodigital -f docker-compose.yml -f docker-compose.local.yml up -d
# la primera vez, asigna el rol de administrador (Laravel no tenía roles: catálogos y grupos se
# abrían por URL). Con la base de prueba usa SECA800424:
docker exec siarchivodigital-db mariadb -uroot -parchivo_local adminplem_archivoDigital -e \
  "INSERT IGNORE INTO usuario_roles (rfc, rol_id, created_at, updated_at) SELECT 'RFC_ADMIN', id, NOW(), NOW() FROM roles WHERE clave='administrador'"
```

MariaDB queda en `127.0.0.1:3398` (root / `archivo_local`). Para empezar de cero:
`docker compose -p siarchivodigital -f docker-compose.yml -f docker-compose.local.yml down -v`.

### 4. Producción

`docker compose -f docker-compose.prod.yml up -d --build` construye el frontend con
`BASE_HREF=/archivodigital/` (nginx) y el backend en Node 24. El frontend llama a la API en
`/archivodigital/backend` (ver `src/environments/environment.production.ts`), así que el proxy
inverso del servidor debe enviar esa ruta al contenedor del backend.

## Cambios de comportamiento respecto a Laravel

- **Folio automático.** Ya no se captura a mano. Como en Laravel el folio se editaba y el contador
  de `folios` quedaba atrasado (había 418 folios repetidos en 2026), el siguiente consecutivo es el
  mayor entre el contador y los folios recientes con ese prefijo, y nunca repite uno existente.
- **Editar no borra turnos.** Laravel eliminaba y recreaba todos los turnos (perdiendo conclusiones).
  Ahora solo se agregan o quitan los turnos iniciales que cambiaron y siguen pendientes.
- **Turnar a quien ya lo tenía.** Laravel rechazaba toda la operación; ahora se omite a quien ya
  tiene turno y, si solo lo tenía para conocimiento, se promueve a atención.
- **Cierre en cascada.** Al concluir un turno, si quien lo turnó ya no tiene turnos delegados
  pendientes, su turno se cierra también; el registro se concluye cuando no quedan turnos de
  atención pendientes. (En Laravel dependía del `rango` del usuario.)
- **Destinatarios** con la misma regla de Laravel (su departamento, más rangos distintos de 4 de su
  dirección, las direcciones `…01`, la 40011 y la 41001; jefes de departamento: su departamento y
  rangos 1–3 de su dirección), pero sin las excepciones por RFC que estaban fijas en el código.
- **Login** igual que Laravel (`users_safs` por RFC, mismos hashes `$2y$`), con dos diferencias:
  no entran cuentas con baja lógica (`deleted_at`) y se respeta `bloqueo`, que comparten los
  sistemas de la SAF. Este sistema no incrementa `intentos`.
- **Búsqueda** limitada a los documentos a los que el usuario tiene acceso (el administrador ve todos).
- **Agenda** incluye también los documentos que el usuario registró, no solo los turnados.
- **Sin reglas por RFC.** Se eliminaron las listas de RFC fijas en el código (presidencia,
  destinatarios agregados a mano, etc.): los destinatarios son los servidores públicos activos de la
  misma dependencia más los grupos.

## Pendiente de migrar

Quedó fuera de esta primera versión, por depender de otras bases o de reglas fijas por RFC:

- Diputados, gabinete y cumpleaños (bases `adminleg_bd` y del Pleno).
- Solicitudes de información (`solicitud_infos`; en Laravel el guardado no estaba terminado).
- Notificaciones por WhatsApp (UltraMsg) y correo.
- Aviso de privacidad / términos (`avisos_terminos`), cambio de contraseña y PDF del volante de turno.
- Pantalla para administrar lectores delegados (`us_lecturas`).
