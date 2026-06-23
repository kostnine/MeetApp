import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ProfilesModule } from '../profiles/profiles.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [ProfilesModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, AdminGuard],
})
export class ReservationsModule {}
