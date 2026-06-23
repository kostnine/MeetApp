import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  identifier?: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(/^[a-zA-Z0-9_]+$/)
  nickname!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
