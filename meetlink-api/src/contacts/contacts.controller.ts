import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { ContactsService } from './contacts.service';
import { CreateContactRequestDto } from './dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  create(@Body() dto: CreateContactRequestDto) {
    return this.contacts.create(dto);
  }

  @Get()
  @UseGuards(AdminGuard)
  list(@Req() request: AuthenticatedRequest, @Query('source') source?: string) {
    return this.contacts.listForOwner(request.user?.profileId, source);
  }
}
