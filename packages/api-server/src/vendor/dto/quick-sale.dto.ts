import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class QuickSaleDto {
  @IsUUID()
  inventoryItemId!: string;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  precoVenda!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  compradorNome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
