import { Injectable } from '@nestjs/common';
import { promisify } from 'util';
import * as fs from 'fs';
import * as cheerio from 'cheerio';
import { Transaction, TransactionDate } from './dbank.model';

const readFile = promisify(fs.readFile);

@Injectable()
export class DBankService {
  composeFileNameFromYearMonth(year: string, month: string): string {
    const monthString = ('0' + month).slice(-2);
    return `${year}${monthString}`;
  }

  async createMonthlyTransactionReport(
    year: string = '2018',
    month: string = '1',
  ): Promise<Transaction[]> {
    const html = await this.getHtmlFileContent(
      this.composeFileNameFromYearMonth(year, month),
    );

    const $ = cheerio.load(`<table>${html}</table>`); // won't work correctly without <table>
    const transactions: Transaction[] = [];

    $('.hasSEPADetails').each((index, element) => {
      transactions.push({
        bookingDate: this.decomposeDate(
          $('[headers="bTentry"]', element).text(),
        ),
        credit: this.resolveCreditFromTransactionCheerio($(element)),
        currency: $('[headers="bTcurrency"]', element).text(),
        details: $(element)
          .next()
          .text(),
        executionDate: this.decomposeDate(
          $('[headers="bTvalue"]', element).text(),
        ),
        purpose: $('[headers="bTpurpose"]', element).text(),
      });
      return JSON.stringify({ tata: $(element).text() });
    });

    return transactions;
  }

  decomposeDate(date: string): TransactionDate {
    const dateParts = date.split('.');

    return {
      day: dateParts[0],
      month: dateParts[1],
      year: dateParts[2],
    };
  }

  formatCurrencyValueAsNumber(value: string): number {
    console.log(value);
    return Number(
      value
        .replace(/[^\d\-\.,]/g, '')
        .replace(/\./g, '')
        .replace(',', '.'),
    );
  }

  async getHtmlFileContent(fileName): Promise<string> {
    return await readFile(`data/html/${fileName}.html`, 'utf8');
  }

  getMonthlyTransactionReport(): object {
    // TODO
    return { data: 'Hello Master!' };
  }

  resolveCreditFromTransactionCheerio(transactionCheerio: Cheerio): number {
    const creditValue = this.formatCurrencyValueAsNumber(
      transactionCheerio.find('[headers="bTcredit"]').text(),
    );
    const debitValue = this.formatCurrencyValueAsNumber(
      transactionCheerio.find('[headers="bTdebit"]').text(),
    );

    return creditValue || debitValue;
  }
}
