import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DBankController } from './dbank.controller';
import { DBankService } from './dbank.service';

@Module({
  imports: [],
  controllers: [AppController, DBankController],
  providers: [AppService, DBankService],
})
export class AppModule {}
