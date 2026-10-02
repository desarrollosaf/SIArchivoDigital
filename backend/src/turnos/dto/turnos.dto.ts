import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AArreglo, ANumero, ATexto } from '../../common/transformaciones';

export class TurnarDto {
  @AArreglo()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  atencion: string[] = [];

  @AArreglo()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  conocimiento: string[] = [];

  @IsOptional()
  @ATexto()
  @IsString()
  indicaciones?: string;
}

/** Cierre de un turno. Multipart: puede traer el documento de respuesta. */
export class ConcluirTurnoDto {
  @IsOptional()
  @ATexto()
  @IsString()
  @MaxLength(255, { message: 'El comentario debe tener máximo 255 caracteres' })
  comentario?: string;

  @IsOptional()
  @ANumero()
  @IsInt()
  seccionId?: number;

  @IsOptional()
  @ANumero()
  @IsInt()
  serieId?: number;

  @IsOptional()
  @ANumero()
  @IsInt()
  subserieId?: number;
}
