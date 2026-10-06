import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { AArreglo, ANumero, ATexto } from '../../common/transformaciones';

const HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/** Captura de un documento. Llega como multipart porque puede traer el archivo escaneado. */
export class RegistroDto {
  @IsDateString({}, { message: 'La fecha de recepción no es válida' })
  fechaRecepcion!: string;

  @IsOptional()
  @ATexto()
  @IsDateString({}, { message: 'La fecha del documento no es válida' })
  fechaDocumento?: string;

  @IsOptional()
  @ATexto()
  @IsString()
  @MaxLength(255)
  referenciaDocumento?: string;

  @IsDateString({}, { message: 'La fecha límite de atención no es válida' })
  fechaLimiteAtencion!: string;

  @IsOptional()
  @ATexto()
  @Matches(HORA, { message: 'La hora de inicio no es válida' })
  horaInicio?: string;

  @IsOptional()
  @ATexto()
  @Matches(HORA, { message: 'La hora de término no es válida' })
  horaTermino?: string;

  @ANumero()
  @IsInt({ message: 'Selecciona el tipo de atención' })
  tipoAtencion!: number;

  @ANumero()
  @IsInt({ message: 'Selecciona la serie' })
  serieId!: number;

  /** "Indicaciones" en la interfaz. */
  @ATexto()
  @IsString({ message: 'Captura las indicaciones' })
  @IsNotEmpty({ message: 'Captura las indicaciones' })
  tituloDoc!: string;

  /** "Asunto" en la interfaz. */
  @ATexto()
  @IsString({ message: 'Captura el asunto' })
  @IsNotEmpty({ message: 'Captura el asunto' })
  descripcionDoc!: string;

  /** RFC del remitente, o "999" para un remitente externo. */
  @ATexto()
  @IsString({ message: 'Selecciona el remitente' })
  @IsNotEmpty({ message: 'Selecciona el remitente' })
  remitenteRfc!: string;

  @IsOptional()
  @ATexto()
  @IsString()
  @MaxLength(255)
  otroRemitente?: string;

  @IsOptional()
  @ANumero()
  @IsInt()
  @Min(0)
  fojas?: number;

  @IsOptional()
  @ANumero()
  @IsInt()
  tipoSolicitud?: number;

  @IsOptional()
  @ANumero()
  @IsInt()
  salon?: number;

  @IsOptional()
  @ATexto()
  @IsString()
  nombreEvento?: string;

  /** id del registro previo con el que se relaciona (seguimiento). */
  @IsOptional()
  @ANumero()
  @IsInt()
  folioRastreo?: number;

  /** RFCs o grupos ("G:<id>") a quienes se turna para su atención. */
  @AArreglo()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  atencion: string[] = [];

  /** RFCs o grupos ("G:<id>") a quienes se turna solo para su conocimiento. */
  @AArreglo()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  conocimiento: string[] = [];

  // Solo los usa el rol Recepción de Presidencia; para los demás se ignoran.

  /** 1 = Confidencial, 2 = Ordinaria. */
  @IsOptional()
  @ANumero()
  @IsIn([1, 2], { message: 'El tipo de correspondencia no es válido' })
  tipoCorrespondencia?: number;

  /** RFC de a quién va dirigido el documento, o "99999" (otro, se especifica aparte). */
  @IsOptional()
  @ATexto()
  @IsString()
  @MaxLength(10)
  destinatario?: string;

  @IsOptional()
  @ATexto()
  @IsString()
  @MaxLength(255)
  destinatarioOtro?: string;
}
