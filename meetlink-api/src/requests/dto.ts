import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateMeetRequestDto {
  @IsOptional()
  @IsString()
  ownerNickname?: string;

  @IsIn(['nearby', 'offline'])
  type!: 'nearby' | 'offline';

  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsString()
  lookingFor?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  radius?: number;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(80)
  ageMin?: number;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(80)
  ageMax?: number;

  @IsOptional()
  @IsBoolean()
  visibleOnMap?: boolean;

  @IsOptional()
  @IsString()
  place?: string;

  @IsOptional()
  @IsIn(['profile', 'anonymous', 'custom'])
  displayAs?: 'profile' | 'anonymous' | 'custom';

  @IsOptional()
  @IsString()
  customName?: string;

  @IsOptional()
  @IsString()
  expires?: string;
}

export class RespondToMeetRequestDto {
  @IsIn(['new', 'accepted', 'declined'])
  status!: 'new' | 'accepted' | 'declined';

  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(80)
  age?: number;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
