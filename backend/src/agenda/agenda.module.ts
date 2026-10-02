import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

@Module({
  imports: [CompartidoModule],
  controllers: [AgendaController],
  providers: [AgendaService],
})
export class AgendaModule {}
