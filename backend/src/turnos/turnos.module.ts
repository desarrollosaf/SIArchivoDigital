import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';

@Module({
  imports: [CompartidoModule],
  controllers: [TurnosController],
  providers: [TurnosService],
})
export class TurnosModule {}
