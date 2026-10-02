import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { CatalogosModule } from '../catalogos/catalogos.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  imports: [CompartidoModule, CatalogosModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
