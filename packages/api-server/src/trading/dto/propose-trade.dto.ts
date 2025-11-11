import { ArrayNotEmpty, IsArray, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ProposeTradeDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  recetorId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  proponenteItemIds!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  recetorItemIds!: string[];

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  proponenteDinheiro?: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  recetorDinheiro?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  observacoes?: string;
}
