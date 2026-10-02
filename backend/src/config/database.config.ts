import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  main: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  external: {
    host: process.env.DB_EXTERNAL_HOST,
    port: parseInt(process.env.DB_EXTERNAL_PORT ?? '3306', 10),
    username: process.env.DB_EXTERNAL_USERNAME,
    password: process.env.DB_EXTERNAL_PASSWORD,
    database: process.env.DB_EXTERNAL_DATABASE,
  },
  legislativo: {
    host: process.env.DB_LEGISLATIVO_HOST,
    port: parseInt(process.env.DB_LEGISLATIVO_PORT ?? '3306', 10),
    username: process.env.DB_LEGISLATIVO_USERNAME,
    password: process.env.DB_LEGISLATIVO_PASSWORD,
    database: process.env.DB_LEGISLATIVO_DATABASE,
  },
}));
