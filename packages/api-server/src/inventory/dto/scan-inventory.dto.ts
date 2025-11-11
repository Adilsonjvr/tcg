import { IsNotEmpty, IsString } from 'class-validator';

export class ScanInventoryDto {
  @IsString()
  @IsNotEmpty()
  imageBase64!: string;
}
