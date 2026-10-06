import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Registro } from './models/registro.model';
import { RegistroAtencion } from './models/registro-atencion.model';
import { Comentario } from './models/comentario.model';
import { Respuesta } from './models/respuesta.model';
import { Agenda } from './models/agenda.model';
import { Folio } from './models/folio.model';
import { Seccion } from './models/seccion.model';
import { Serie } from './models/serie.model';
import { SubSerie } from './models/sub-serie.model';
import {
  TipoAtencion,
  TipoSolicitud,
  Salon,
  Modalidad,
  TipoEvento,
  TipoReunion,
} from './models/catalogos-simples.model';
import {
  ComisionRegistro,
  RegistroPresidencia,
} from './models/registro-presidencia.model';
import { ComisionLegislativo } from './models/comision-legislativo.model';
import { Grupo, Miembro } from './models/grupo.model';
import { UsLectura } from './models/us-lectura.model';
import { UsersSafs } from './models/users-safs.model';
import { SUsuario } from './models/s-usuario.model';
import { SUsers } from './models/s-users.model';
import { TDependencia } from './models/t-dependencia.model';
import { TDireccion } from './models/t-direccion.model';
import { TDepartamento } from './models/t-departamento.model';
import { PumpesGabinete } from './models/pumpes-gabinete.model';

export const MODELOS_ARCHIVO = [
  Registro,
  RegistroAtencion,
  Comentario,
  Respuesta,
  Agenda,
  Folio,
  Seccion,
  Serie,
  SubSerie,
  TipoAtencion,
  TipoSolicitud,
  Salon,
  Modalidad,
  Grupo,
  Miembro,
  UsLectura,
  TipoEvento,
  TipoReunion,
  RegistroPresidencia,
  ComisionRegistro,
  PumpesGabinete,
];

export const MODELOS_SAF = [
  UsersSafs,
  SUsuario,
  SUsers,
  TDependencia,
  TDireccion,
  TDepartamento,
];

// Deja disponibles los modelos de ambas conexiones: "default" (adminplem_archivoDigital, tablas
// heredadas de Laravel) y "external" (adminplem_saf, padrón de usuarios). Los módulos de dominio
// solo importan este módulo y se inyectan los modelos que necesiten.
@Module({
  imports: [
    SequelizeModule.forFeature(MODELOS_ARCHIVO),
    SequelizeModule.forFeature(MODELOS_SAF, 'external'),
    SequelizeModule.forFeature([ComisionLegislativo], 'legislativo'),
  ],
  exports: [SequelizeModule],
})
export class ArchivoDbModule {}
