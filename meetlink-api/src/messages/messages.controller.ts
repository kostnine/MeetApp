import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { SendMessageDto, StartConversationDto } from './dto';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  // Every conversation route is per-user: a resolved profile id is REQUIRED so the service
  // never falls back to an unscoped query. Reject principals without one (e.g. legacy
  // x-admin-token / a token missing the profileId claim).
  private requireProfileId(request: AuthenticatedRequest): string {
    const id = request.user?.profileId;
    if (!id) throw new UnauthorizedException('A user profile is required');
    return id;
  }

  @Post('conversations')
  @UseGuards(AdminGuard)
  startConversation(@Req() request: AuthenticatedRequest, @Body() dto: StartConversationDto) {
    return this.messages.startConversation(dto, this.requireProfileId(request));
  }

  @Get('conversations')
  @UseGuards(AdminGuard)
  listConversations(@Req() request: AuthenticatedRequest) {
    return this.messages.listConversations(this.requireProfileId(request));
  }

  @Get('conversations/:id')
  @UseGuards(AdminGuard)
  getConversation(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.messages.getConversation(id, this.requireProfileId(request));
  }

  // The counterpart's profile incl. contacts — only for a participant of this conversation.
  @Get('conversations/:id/counterpart')
  @UseGuards(AdminGuard)
  getCounterpart(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.messages.getCounterpartProfile(id, this.requireProfileId(request));
  }

  @Post('conversations/:id/messages')
  @UseGuards(AdminGuard)
  sendMessage(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.messages.addMessage(id, dto, this.requireProfileId(request));
  }

  @Patch('conversations/:id/read')
  @UseGuards(AdminGuard)
  markRead(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.messages.markRead(id, this.requireProfileId(request));
  }

  @Patch('conversations/:id/block')
  @UseGuards(AdminGuard)
  blockConversation(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.messages.setBlocked(id, true, this.requireProfileId(request));
  }

  @Patch('conversations/:id/unblock')
  @UseGuards(AdminGuard)
  unblockConversation(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.messages.setBlocked(id, false, this.requireProfileId(request));
  }
}
