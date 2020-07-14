import { Controller, Get, Post, Body } from '@nestjs/common';
import { MonthlyTransactionReportRequest } from './app.model';
import { DkbService } from './dkb.service';

@Controller('dkb')
export class DkbController {
  constructor(private readonly dkbService: DkbService) {}

  @Post()
  async createMonthlyTransactionReport(
    @Body()
    monthlyTransactionReportRequest: MonthlyTransactionReportRequest,
  ): Promise<void> {
    await this.dkbService.createMonthlyTransactionReport(
      monthlyTransactionReportRequest,
    );
  }
}
