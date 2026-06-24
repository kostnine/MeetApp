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

  // Enforce the same strength rules the client shows, server-side — so the API can't be
  // used to create weak-password accounts that bypass the UI checklist.
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain a symbol' })
  password!: string;
}
