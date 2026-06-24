import { IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class StartConversationDto {
  @IsOptional()
  @IsString()
  ownerNickname?: string;

  @IsOptional()
  @IsString()
  guestNickname?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsIn(['owner', 'guest'])
  sender?: 'owner' | 'guest';

  @IsOptional()
  @IsIn(['profile', 'map', 'booking', 'nearby', 'request', 'chat'])
  source?: 'profile' | 'map' | 'booking' | 'nearby' | 'request' | 'chat';

  // The story this first message replies to (server sanitizes + caps it).
  @IsOptional()
  @IsObject()
  replyStory?: Record<string, unknown>;
}

export class SendMessageDto {
  @IsIn(['owner', 'guest'])
  sender!: 'owner' | 'guest';

  @IsString()
  @MinLength(1)
  body!: string;

  // The story this message replies to (server sanitizes + caps it).
  @IsOptional()
  @IsObject()
  replyStory?: Record<string, unknown>;
}
