import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { CatalogosModule } from '../catalogos/catalogos.module';
import { RegistrosController } from './registros.controller';
import { RegistrosService } from './registros.service';

@Module({
  imports: [CompartidoModule, CatalogosModule],
  controllers: [RegistrosController],
  providers: [RegistrosService],
})
export class RegistrosModule {}
