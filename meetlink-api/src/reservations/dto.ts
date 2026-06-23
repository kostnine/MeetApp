import { IsDateString, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateReservationDto {
  @IsOptional()
  @IsString()
  ownerNickname?: string;

  @IsOptional()
  @IsString()
  guestNickname?: string;

  @IsString()
  @MinLength(3)
  contact!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsDateString()
  meetingDate!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  meetingTime!: string;

  @IsOptional()
  @IsString()
  place?: string;
}

export class UpdateReservationStatusDto {
  @IsIn(['new', 'confirmed', 'cancelled', 'done'])
  status!: 'new' | 'confirmed' | 'cancelled' | 'done';
}
