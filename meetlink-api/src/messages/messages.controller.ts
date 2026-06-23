import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { SendMessageDto, StartConversationDto } from './dto';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post('conversations')
  @UseGuards(AdminGuard)
  startConversation(@Req() request: AuthenticatedRequest, @Body() dto: StartConversationDto) {
    return this.messages.startConversation(dto, request.user?.profileId);
  }

  @Get('conversations')
  @UseGuards(AdminGuard)
  listConversations(@Req() request: AuthenticatedRequest) {
    return this.messages.listConversations(request.user?.profileId);
  }

  @Get('conversations/:id')
  @UseGuards(AdminGuard)
  getConversation(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.messages.getConversation(id, request.user?.profileId);
  }

  @Post('conversations/:id/messages')
  @UseGuards(AdminGuard)
  sendMessage(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.messages.addMessage(id, dto, request.user?.profileId);
  }

  @Patch('conversations/:id/block')
  @UseGuards(AdminGuard)
  blockConversation(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.messages.setBlocked(id, true, request.user?.profileId);
  }

  @Patch('conversations/:id/unblock')
  @UseGuards(AdminGuard)
  unblockConversation(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.messages.setBlocked(id, false, request.user?.profileId);
  }
}
