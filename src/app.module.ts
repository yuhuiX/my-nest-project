import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DBankController } from './dbank.controller';
import { DBankService } from './dbank.service';
import { DkbController } from './dkb.controller';
import { DkbService } from './dkb.service';

@Module({
  imports: [],
  controllers: [AppController, DBankController, DkbController],
  providers: [AppService, DBankService, DkbService],
})
export class AppModule {}
