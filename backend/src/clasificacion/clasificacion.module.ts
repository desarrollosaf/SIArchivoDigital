import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { ClasificacionController } from './clasificacion.controller';
import { ClasificacionService } from './clasificacion.service';

@Module({
  imports: [CompartidoModule],
  controllers: [ClasificacionController],
  providers: [ClasificacionService],
})
export class ClasificacionModule {}
