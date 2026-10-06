import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { AgendaPresidenciaController } from './agenda-presidencia.controller';
import { AgendaPresidenciaService } from './agenda-presidencia.service';
import { EventosLegislativosController } from './eventos-legislativos.controller';
import { EventosLegislativosService } from './eventos-legislativos.service';
import { CumpleanosController } from './cumpleanos.controller';
import { CumpleanosService } from './cumpleanos.service';
import { ProximosEventosController } from './proximos-eventos.controller';
import { ProximosEventosService } from './proximos-eventos.service';
import { GabineteController } from './gabinete.controller';
import { GabineteService } from './gabinete.service';
import { DiputadosController } from './diputados.controller';
import { DiputadosService } from './diputados.service';

@Module({
  imports: [CompartidoModule],
  // EventosLegislativosController y ProximosEventosController van primero: sus rutas fijas
  // ("legislativos/...", "proximos") no deben confundirse con parámetros de las de la agenda.
  controllers: [
    EventosLegislativosController,
    ProximosEventosController,
    AgendaPresidenciaController,
    CumpleanosController,
    GabineteController,
    DiputadosController,
  ],
  providers: [
    AgendaPresidenciaService,
    EventosLegislativosService,
    CumpleanosService,
    ProximosEventosService,
    GabineteService,
    DiputadosService,
  ],
})
export class AgendaPresidenciaModule {}
