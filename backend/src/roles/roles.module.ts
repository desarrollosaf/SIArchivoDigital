import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Rol } from '../database/models/rol.model';
import { UsuarioRol } from '../database/models/usuario-rol.model';
import { SUsuario } from '../database/models/s-usuario.model';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Rol, UsuarioRol]),
    SequelizeModule.forFeature([SUsuario], 'external'),
    JwtAuthModule,
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
