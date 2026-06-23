import { Module } from '@nestjs/common';
import { OnlineGateway } from './online.gateway';

@Module({
  providers: [OnlineGateway],
  exports: [OnlineGateway],
})
export class OnlineModule {}
