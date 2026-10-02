import { Module } from '@nestjs/common';
import { ArchivoDbModule } from '../database/archivo-db.module';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { ArchivosService } from './archivos.service';
import { PadronService } from './padron.service';
import { AccesoService } from './acceso.service';
import { DestinatariosService } from './destinatarios.service';
import { AgendaSyncService } from './agenda-sync.service';
import { EstatusRegistroService } from './estatus-registro.service';

const SERVICIOS = [
  ArchivosService,
  PadronService,
  AccesoService,
  DestinatariosService,
  AgendaSyncService,
  EstatusRegistroService,
];

/** Servicios que usan todos los módulos de dominio: archivos, padrón y control de acceso. */
@Module({
  imports: [ArchivoDbModule, JwtAuthModule],
  providers: SERVICIOS,
  exports: [ArchivoDbModule, JwtAuthModule, ...SERVICIOS],
})
export class CompartidoModule {}
