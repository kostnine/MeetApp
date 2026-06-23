import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000000)
  avatarUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  avatarPositionX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  avatarPositionY?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  telegram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  area?: string;

  @IsOptional()
  @IsBoolean()
  showOnMap?: boolean;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  visibilityRadiusMeters?: number;

  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  interests?: string[];

  @IsOptional()
  @IsBoolean()
  approximateLocation?: boolean;

  @IsOptional()
  @IsBoolean()
  messagesFromNearby?: boolean;

  @IsOptional()
  @IsBoolean()
  messagesFromRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  contactsAfterApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMessages?: boolean;
}

export class AddProfilePhotoDto {
  @IsString()
  @MaxLength(3000000)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  caption?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  positionX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  positionY?: number;
}

export class UpdateProfilePhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(3000000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  caption?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  positionX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  positionY?: number;
}
