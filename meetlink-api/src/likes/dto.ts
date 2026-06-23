import { IsString } from 'class-validator';

export class CreateLikeDto {
  @IsString()
  fromNickname!: string;

  @IsString()
  toNickname!: string;
}
