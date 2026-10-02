import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import storageConfig from './config/storage.config';
import { MODELOS_ARCHIVO, MODELOS_SAF } from './database/archivo-db.module';
import { Rol } from './database/models/rol.model';
import { UsuarioRol } from './database/models/usuario-rol.model';
import { ComisionLegislativo } from './database/models/comision-legislativo.model';
import { AuthModule } from './auth/auth.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { RegistrosModule } from './registros/registros.module';
import { TurnosModule } from './turnos/turnos.module';
import { ComentariosModule } from './comentarios/comentarios.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { AgendaModule } from './agenda/agenda.module';
import { ConcentracionModule } from './concentracion/concentracion.module';
import { ReportesModule } from './reportes/reportes.module';
import { ClasificacionModule } from './clasificacion/clasificacion.module';
import { GruposModule } from './grupos/grupos.module';
import { RolesModule } from './roles/roles.module';
import { AgendaPresidenciaModule } from './agenda-presidencia/agenda-presidencia.module';

interface MysqlConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig, storageConfig],
    }),
    // Conexión principal (default): adminplem_archivoDigital, la misma base del sistema Laravel.
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): SequelizeModuleOptions => {
        const db = config.get<MysqlConnectionConfig>('database.main')!;
        return {
          dialect: 'mysql',
          ...db,
          models: [...MODELOS_ARCHIVO, Rol, UsuarioRol],
          autoLoadModels: true,
          synchronize: false,
          logging: false,
        };
      },
    }),
    // Conexión externa (adminplem_saf): usuarios para el login y padrón de servidores públicos.
    SequelizeModule.forRootAsync({
      name: 'external',
      inject: [ConfigService],
      useFactory: (config: ConfigService): SequelizeModuleOptions => {
        const db = config.get<MysqlConnectionConfig>('database.external')!;
        return {
          dialect: 'mysql',
          ...db,
          models: MODELOS_SAF,
          autoLoadModels: true,
          synchronize: false,
          logging: false,
        };
      },
    }),
    // Conexión del Legislativo (adminplem_congresoedomex): catálogo de comisiones. Solo lectura.
    SequelizeModule.forRootAsync({
      name: 'legislativo',
      inject: [ConfigService],
      useFactory: (config: ConfigService): SequelizeModuleOptions => {
        const db = config.get<MysqlConnectionConfig>('database.legislativo')!;
        return {
          dialect: 'mysql',
          ...db,
          models: [ComisionLegislativo],
          autoLoadModels: true,
          synchronize: false,
          logging: false,
        };
      },
    }),
    AuthModule,
    RolesModule,
    CatalogosModule,
    RegistrosModule,
    TurnosModule,
    ComentariosModule,
    NotificacionesModule,
    AgendaModule,
    ConcentracionModule,
    ReportesModule,
    ClasificacionModule,
    GruposModule,
    AgendaPresidenciaModule,
  ],
})
export class AppModule {}
