import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateContactRequestDto {
  @IsOptional()
  @IsString()
  ownerNickname?: string;

  @IsOptional()
  @IsString()
  guestNickname?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  telegram?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  comment?: string;

  @IsOptional()
  @IsIn(['profile', 'map', 'booking', 'nearby'])
  source?: 'profile' | 'map' | 'booking' | 'nearby';
}
