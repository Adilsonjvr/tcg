import { UserRole } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome!: string;

  @IsDateString()
  nascimento!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
