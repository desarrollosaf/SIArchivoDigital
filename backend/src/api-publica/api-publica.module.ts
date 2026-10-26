import { Module } from '@nestjs/common';
import { ArchivoDbModule } from '../database/archivo-db.module';
import { ApiPublicaController } from './api-publica.controller';
import { ApiPublicaService } from './api-publica.service';

@Module({
  imports: [ArchivoDbModule],
  controllers: [ApiPublicaController],
  providers: [ApiPublicaService],
})
export class ApiPublicaModule {}
