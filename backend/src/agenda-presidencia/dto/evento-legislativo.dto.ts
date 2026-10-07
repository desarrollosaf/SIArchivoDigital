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

  /** Último día si el evento se repite varios días (mismo horario y sede); vacío = un día. */
  @IsOptional()
  @IsDateString({}, { message: 'La fecha final no es válida' })
  fechaFin?: string | null;

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

  /**
   * Solo al crear: otras fechas (no consecutivas) en las que se repite el mismo evento. Cada una
   * se guarda como un evento propio, con el mismo horario, sede y datos.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30, {
    message: 'Se pueden agregar como máximo 30 fechas adicionales',
  })
  @IsDateString(
    {},
    { each: true, message: 'Alguna fecha adicional no es válida' },
  )
  fechasAdicionales?: string[];
}

/**
 * Reprogramación de un evento (p. ej. por un oficio que informa el cambio de fecha). Lo que no
 * se indique se conserva: "en el mismo horario y requerimientos".
 */
export class ReprogramarEventoDto {
  @IsDateString({}, { message: 'La nueva fecha no es válida' })
  fechaEvento!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La nueva fecha final no es válida' })
  fechaFin?: string | null;

  @IsOptional()
  @Matches(HORA, { message: 'La hora de inicio no es válida' })
  horaInicio?: string;

  @IsOptional()
  @Matches(HORA, { message: 'La hora de término no es válida' })
  horaTermino?: string;

  @IsOptional()
  @IsInt({ message: 'La sede no es válida' })
  sede?: number;

  @IsString()
  @IsNotEmpty({ message: 'Indica el motivo u oficio de la reprogramación' })
  @MaxLength(1000)
  motivo!: string;
}
