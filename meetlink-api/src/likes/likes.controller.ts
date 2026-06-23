import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateLikeDto } from './dto';
import { LikesService } from './likes.service';

@Controller('likes')
export class LikesController {
  constructor(private readonly likes: LikesService) {}

  @Post()
  create(@Body() dto: CreateLikeDto) {
    return this.likes.create(dto);
  }

  @Get(':nickname')
  listForNickname(@Param('nickname') nickname: string) {
    return this.likes.listForNickname(nickname.replace(/^@/, ''));
  }
}
