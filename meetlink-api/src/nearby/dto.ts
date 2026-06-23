import { Type } from 'class-transformer';
import { IsBoolean, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertLocationDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsLatitude()
  @Type(() => Number)
  lat!: number;

  @IsLongitude()
  @Type(() => Number)
  lng!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accuracyMeters?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isVisible?: boolean;
}

export class NearbyQueryDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsLatitude()
  @Type(() => Number)
  lat!: number;

  @IsLongitude()
  @Type(() => Number)
  lng!: number;

  @IsOptional()
  @Min(100)
  @Max(5000)
  @Type(() => Number)
  radius?: number;
}
