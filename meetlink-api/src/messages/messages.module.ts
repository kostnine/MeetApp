import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { OnlineModule } from '../online/online.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [ProfilesModule, OnlineModule],
  controllers: [MessagesController],
  providers: [MessagesService, AdminGuard],
  exports: [MessagesService],
})
export class MessagesModule {}
