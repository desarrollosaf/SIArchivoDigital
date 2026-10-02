import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { CatalogosModule } from '../catalogos/catalogos.module';
import { ConcentracionController } from './concentracion.controller';
import { ConcentracionService } from './concentracion.service';

@Module({
  imports: [CompartidoModule, CatalogosModule],
  controllers: [ConcentracionController],
  providers: [ConcentracionService],
})
export class ConcentracionModule {}
