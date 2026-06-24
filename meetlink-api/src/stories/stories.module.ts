import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { OnlineModule } from '../online/online.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [ProfilesModule, OnlineModule],
  controllers: [StoriesController],
  providers: [StoriesService, AdminGuard],
})
export class StoriesModule {}
