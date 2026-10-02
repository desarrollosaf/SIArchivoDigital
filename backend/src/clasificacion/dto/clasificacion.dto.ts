import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SeccionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  seccion!: string;

  /** id_Departamento de adminplem_saf.t_departamento. */
  @IsInt()
  departamentoId!: number;
}

export class SerieDto {
  @IsInt()
  idSeccion!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  serie!: string;

  @IsOptional()
  @IsBoolean()
  horarios?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracionSistema?: number;
}

export class SubSerieDto {
  @IsInt()
  idSerie!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subserie!: string;
}
