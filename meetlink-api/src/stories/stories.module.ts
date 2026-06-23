import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ProfilesModule } from '../profiles/profiles.module';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [ProfilesModule],
  controllers: [StoriesController],
  providers: [StoriesService, AdminGuard],
})
export class StoriesModule {}
