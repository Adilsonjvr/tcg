import { IsString, Length } from 'class-validator';

export class LinkParentDto {
  @IsString()
  @Length(8, 8)
  parentLinkCode!: string;
}
