import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { InventoryVisibility } from '@prisma/client';

export class UpdateInventoryItemDto {
  @IsOptional()
  @IsEnum(InventoryVisibility)
  visibility?: InventoryVisibility;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  precoVendaDesejado?: number;
}
