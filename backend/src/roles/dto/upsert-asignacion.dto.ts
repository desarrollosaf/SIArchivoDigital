import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class UpsertAsignacionDto {
  @IsString()
  @IsNotEmpty()
  rfc: string;

  @IsInt()
  rolId: number;
}
