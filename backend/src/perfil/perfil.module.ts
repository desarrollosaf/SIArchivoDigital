import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';

@Module({
  imports: [CompartidoModule],
  controllers: [PerfilController],
  providers: [PerfilService],
})
export class PerfilModule {}
