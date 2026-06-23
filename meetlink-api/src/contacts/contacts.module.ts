import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ProfilesModule } from '../profiles/profiles.module';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [ProfilesModule],
  controllers: [ContactsController],
  providers: [ContactsService, AdminGuard],
})
export class ContactsModule {}
