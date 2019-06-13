import { Controller, Get, Post, Body } from '@nestjs/common';
import { DBankService } from './dbank.service';
import { Transaction, MonthlyTransactionReportRequest } from './dbank.model';

@Controller('dbank')
export class DBankController {
  constructor(private readonly dBankService: DBankService) {}

  @Post()
  async createMonthlyTransactionReport(
    @Body()
    monthlyTransactionReportRequest: MonthlyTransactionReportRequest,
  ): Promise<void> {
    await this.dBankService.createMonthlyTransactionReport(
      monthlyTransactionReportRequest,
    );
  }

  @Get()
  getMonthlyTransactionReport(): any {
    return this.dBankService.getMonthlyTransactionReport();
  }
}
