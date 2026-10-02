import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';

@Module({
  imports: [CompartidoModule],
  controllers: [GruposController],
  providers: [GruposService],
})
export class GruposModule {}
