import { Controller, Get, Post } from '@nestjs/common';
import { DBankService } from './dbank.service';
import { Transaction } from './dbank.model';

@Controller('dbank')
export class DBankController {
  constructor(private readonly dBankService: DBankService) {}

  @Post()
  createMonthlyTransactionReport(): Promise<Transaction[]> {
    return this.dBankService.createMonthlyTransactionReport();
  }

  @Get()
  getMonthlyTransactionReport(): any {
    return this.dBankService.getMonthlyTransactionReport();
  }
}
