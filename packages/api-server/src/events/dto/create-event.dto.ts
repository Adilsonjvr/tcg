import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsNumber, MaxLength, Min } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  venueName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  latitude?: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  longitude?: number;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidade?: number;
}
