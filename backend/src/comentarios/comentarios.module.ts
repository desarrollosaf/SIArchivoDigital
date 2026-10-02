import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { ComentariosController } from './comentarios.controller';
import { ComentariosService } from './comentarios.service';

@Module({
  imports: [CompartidoModule],
  controllers: [ComentariosController],
  providers: [ComentariosService],
})
export class ComentariosModule {}
