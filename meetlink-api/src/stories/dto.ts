import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  place?: string;

  @IsOptional()
  @IsString()
  visibleFor?: string;

  @IsOptional()
  @IsString()
  whoCanMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  imageUrl?: string;
}
