import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class StartConversationDto {
  @IsOptional()
  @IsString()
  ownerNickname?: string;

  @IsOptional()
  @IsString()
  guestNickname?: string;

  // When a signed-in person starts/continues the chat, link it to their profile
  // directly (more reliable than matching by nickname).
  @IsOptional()
  @IsString()
  guestProfileId?: string;

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
}

export class SendMessageDto {
  @IsIn(['owner', 'guest'])
  sender!: 'owner' | 'guest';

  @IsString()
  @MinLength(1)
  body!: string;
}
