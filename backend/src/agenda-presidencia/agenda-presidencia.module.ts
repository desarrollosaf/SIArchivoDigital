import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { AgendaPresidenciaController } from './agenda-presidencia.controller';
import { AgendaPresidenciaService } from './agenda-presidencia.service';
import { EventosLegislativosController } from './eventos-legislativos.controller';
import { EventosLegislativosService } from './eventos-legislativos.service';

@Module({
  imports: [CompartidoModule],
  // EventosLegislativosController va primero: sus rutas fijas ("legislativos/...") no deben
  // confundirse con parámetros de las de la agenda.
  controllers: [EventosLegislativosController, AgendaPresidenciaController],
  providers: [AgendaPresidenciaService, EventosLegislativosService],
})
export class AgendaPresidenciaModule {}
