import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { ContactsModule } from './contacts/contacts.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { LikesModule } from './likes/likes.module';
import { MessagesModule } from './messages/messages.module';
import { NearbyModule } from './nearby/nearby.module';
import { OnlineModule } from './online/online.module';
import { ProfilesModule } from './profiles/profiles.module';
import { RequestsModule } from './requests/requests.module';
import { ReservationsModule } from './reservations/reservations.module';
import { StoriesModule } from './stories/stories.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Serve the built Vue SPA (copied to ../client) for every non-/api route.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api/{*path}'],
    }),
    AuthModule,
    DbModule,
    HealthModule,
    ProfilesModule,
    RequestsModule,
    ReservationsModule,
    ContactsModule,
    MessagesModule,
    NearbyModule,
    LikesModule,
    OnlineModule,
    StoriesModule,
  ],
})
export class AppModule {}
