import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CardCondition, CardLanguage, InventoryVisibility } from '@prisma/client';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  cardDefinitionId!: string;

  @IsEnum(CardCondition)
  condition!: CardCondition;

  @IsEnum(CardLanguage)
  language!: CardLanguage;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  quantity?: number;

  @IsOptional()
  @IsEnum(InventoryVisibility)
  visibility?: InventoryVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  aquisicaoFonte?: string;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  precoCompra?: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  precoVendaDesejado?: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  valorEstimado?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}
