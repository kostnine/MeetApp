import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { NearbyController } from './nearby.controller';
import { NearbyService } from './nearby.service';

@Module({
  imports: [ProfilesModule],
  controllers: [NearbyController],
  providers: [NearbyService],
})
export class NearbyModule {}
