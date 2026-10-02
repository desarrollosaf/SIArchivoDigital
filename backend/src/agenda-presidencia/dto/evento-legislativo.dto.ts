import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/** Captura de un evento legislativo (en Laravel: RegistroPresidencia@store/update). */
export class EventoLegislativoDto {
  @IsDateString({}, { message: 'La fecha del evento no es válida' })
  fechaEvento!: string;

  @Matches(HORA, { message: 'La hora de inicio no es válida' })
  horaInicio!: string;

  @Matches(HORA, { message: 'La hora de término no es válida' })
  horaTermino!: string;

  @IsInt({ message: 'Selecciona el tipo de evento' })
  tipoEvento!: number;

  @IsInt({ message: 'Selecciona la sede' })
  sede!: number;

  @IsInt({ message: 'Selecciona la modalidad' })
  modalidad!: number;

  @IsOptional()
  @IsInt()
  tipoReunion?: number | null;

  @IsString()
  @IsNotEmpty({ message: 'Captura el nombre del evento' })
  @MaxLength(2000)
  nombreEvento!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  materia?: string | null;

  /** UUIDs de adminplem_congresoedomex.comisions (solo para eventos de comisión). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  comisiones?: string[];
}
