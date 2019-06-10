import { Injectable } from '@nestjs/common';
import { promisify } from 'util';
import * as fs from 'fs';
import * as cheerio from 'cheerio';
import {
  Transaction,
  TransactionDate,
  TransactionTag,
  MonthlyTransactionReport,
  MonthlyTransactionReportRequest,
} from './dbank.model';
import { ensureFile, writeFile } from 'fs-extra';
import {
  isGroceryTransaction,
  isIncomeTransaction,
  isInternetTransaction,
  isPhoneTransaction,
  isDrugTransaction,
} from './dbank.tagRules.service';

const readFile = promisify(fs.readFile);

@Injectable()
export class DBankService {
  calculateMonthEndBalance(
    monthStartBalance: number,
    transactions: Transaction[],
  ) {
    return transactions.reduce((balance, { credit }) => {
      return Number((balance + credit).toFixed(2));
    }, monthStartBalance);
  }

  composeFileNameFromYearMonth(year: string, month: string): string {
    const monthString = ('0' + month).slice(-2);
    return `${year}${monthString}`;
  }

  constructTransactions(
    $: CheerioStatic,
    fileNameWithoutExtension: string,
  ): Transaction[] {
    // const selector: string =
    //   fileNameWithoutExtension >= '201408' ? '.hasSEPADetails' : 'tr';
    const selector: string = '.hasSEPADetails';
    const transactions: Transaction[] = [];

    $(selector).each((index, element) => {
      const transactionCheerio = $(element);
      const detailsText = this.resolveDetailsText(transactionCheerio.next());

      transactions.push({
        bookingDate: this.decomposeDate(
          $('[headers="bTentry"]', element).text(),
        ),
        credit: this.resolveCreditFromTransactionCheerio($(element)),
        currency: $('[headers="bTcurrency"]', element).text(),
        details: detailsText,
        executionDate: this.decomposeDate(
          $('[headers="bTvalue"]', element).text(),
        ),
        purpose: $('[headers="bTpurpose"]', element)
          .text()
          .trim(),
        tags: this.initTags(transactionCheerio, detailsText),
      });
    });

    return transactions;
  }

  async createMonthlyTransactionReport({
    month,
    year,
  }: MonthlyTransactionReportRequest): Promise<void> {
    const fileNameWithoutExtension = this.composeFileNameFromYearMonth(
      year,
      month,
    );
    const html = await this.getHtmlFileContent(fileNameWithoutExtension);

    // won't work correctly without <table> as containing <tr>s and <td>s
    const transactions = this.constructTransactions(
      cheerio.load(`<table>${html}</table>`),
      fileNameWithoutExtension,
    );

    const monthStartBalance = 0;
    return await this.writeMonthlyTransactionReportToFile(
      fileNameWithoutExtension,
      {
        monthEndBalance: this.calculateMonthEndBalance(
          monthStartBalance,
          transactions,
        ),
        monthStartBalance,
        transactions,
      },
    );
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

  initTags(transactionCheerio: Cheerio, detailsText: string): TransactionTag[] {
    // PHONE = 'PHONE',

    if (isDrugTransaction(detailsText)) {
      return [TransactionTag.DRUG];
    } else if (isGroceryTransaction(detailsText)) {
      return [TransactionTag.GROCERY];
    } else if (isIncomeTransaction(detailsText)) {
      return [TransactionTag.INCOME];
    } else if (isInternetTransaction(detailsText)) {
      return [TransactionTag.INTERNET];
    } else if (isPhoneTransaction(detailsText)) {
      return [TransactionTag.PHONE];
    } else {
      return [TransactionTag.OTHER];
    }
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

  resolveDetailsText(detailsElement: Cheerio): string {
    return detailsElement
      .find('table td')
      .map((index, tdElement) => {
        return cheerio(tdElement).text();
      })
      .get()
      .filter((text: string) => {
        return text.trim().length > 0;
      })
      .join(' ');
  }

  async writeMonthlyTransactionReportToFile(
    jsonFileName: string,
    monthlyTransactionReport: MonthlyTransactionReport,
  ): Promise<void> {
    const filePath = `data/json/${jsonFileName}.js`;
    await ensureFile(filePath);
    return writeFile(
      filePath,
      `
module.exports = ${JSON.stringify(monthlyTransactionReport, null, 2)};
`,
    );
  }
}
