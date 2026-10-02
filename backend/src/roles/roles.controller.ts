import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesService } from './roles.service';
import { UpsertAsignacionDto } from './dto/upsert-asignacion.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  listRoles() {
    return this.rolesService.listRoles();
  }

  @Get('usuarios')
  searchUsuarios(@Query('search') search: string) {
    return this.rolesService.searchUsuarios(search);
  }

  @Get('asignaciones')
  listAsignaciones() {
    return this.rolesService.listAsignaciones();
  }

  @Put('asignaciones')
  upsertAsignacion(@Body() dto: UpsertAsignacionDto) {
    return this.rolesService.upsertAsignacion(dto.rfc, dto.rolId);
  }

  @Delete('asignaciones/:rfc')
  removeAsignacion(@Param('rfc') rfc: string) {
    return this.rolesService.removeAsignacion(rfc);
  }
}
