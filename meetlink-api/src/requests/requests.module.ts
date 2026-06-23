import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { MessagesModule } from '../messages/messages.module';
import { OnlineModule } from '../online/online.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [ProfilesModule, MessagesModule, OnlineModule],
  controllers: [RequestsController],
  providers: [RequestsService, AdminGuard],
})
export class RequestsModule {}
