import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStoryDto {
  // Optional: a story can be photo-only. The service requires text OR an image.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  text?: string;

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
