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
    if (fileNameWithoutExtension < '201408') {
      return $('tr')
        .get()
        .map(element => {
          return {
            bookingDate: this.decomposeDate(
              $('[headers="valueDate"]', element).text(),
            ),
            credit: this.resolveCreditFromTransactionCheerio($(element)),
            currency: $('[headers="currency"]', element).text(),
            details: $('[headers="description"]', element)
              .text()
              .trim(),
            executionDate: this.decomposeDate(
              $('[headers="postingDate"]', element).text(),
            ),
            purpose: '',
            tags: [],
          };
        });
    } else {
      const transactionList = [];

      $('tr.odd, tr.even').each((index, element) => {
        const currentElement = $(element);
        const prevElement = $(element).prev();

        if (!currentElement.hasClass('hasSEPADetails')) {
          const detailsText = prevElement.hasClass('hasSEPADetails')
            ? this.resolveDetailsText(currentElement)
            : '';
          const tagHtml =
            currentElement.html() +
            (prevElement.hasClass('hasSEPADetails') ? prevElement.html() : '');
          const transactionElement = prevElement.hasClass('hasSEPADetails')
            ? prevElement
            : currentElement;

          transactionList.push({
            bookingDate: this.decomposeDate(
              $('[headers="bTentry"]', transactionElement).text(),
            ),
            credit: this.resolveCreditFromTransactionCheerio(
              transactionElement,
            ),
            currency: $('[headers="bTcurrency"]', transactionElement).text(),
            details: detailsText,
            executionDate: this.decomposeDate(
              $('[headers="bTvalue"]', transactionElement).text(),
            ),
            purpose: $('[headers="bTpurpose"]', transactionElement)
              .text()
              .trim(),
            tags: this.initTags(cheerio(tagHtml)),
          });
        }
      });

      return transactionList;
    }
  }

  async createMonthlyTransactionReport({
    month,
    year,
  }: MonthlyTransactionReportRequest): Promise<void> {
    const fileNameWithoutExtension = this.composeFileNameFromYearMonth(
      year,
      month,
    );
    const html = await this.readHtmlFileContent(fileNameWithoutExtension);

    // won't work correctly without <table> as containing <tr>s and <td>s
    const transactions = this.constructTransactions(
      cheerio.load(`<table>${html}</table>`),
      fileNameWithoutExtension,
    );

    const monthStartBalance = await this.getMonthStartBalance({ month, year });
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

  getMonthlyTransactionReport(): object {
    // TODO
    return { data: 'Hello Master!' };
  }

  async getMonthStartBalance(
    monthlyTransactionReportRequest: MonthlyTransactionReportRequest,
  ): Promise<number> {
    const previousMonthFileName: string = this.getPreviousFileName(
      monthlyTransactionReportRequest,
    );

    try {
      const previousMonthReport = await this.readJsonDataFileAsJson(
        previousMonthFileName,
      );
      return previousMonthReport.monthEndBalance;
    } catch {
      return 0;
    }
  }

  getPreviousFileName({
    month,
    year,
  }: MonthlyTransactionReportRequest): string {
    if (month === '01') {
      const fileNameMonth = '12';
      const fileNameYear = Number(year) - 1;

      return `${fileNameYear}${fileNameMonth}`;
    } else {
      return (Number(year + month) - 1).toString();
    }
  }

  initTags(currentElement: Cheerio): TransactionTag[] {
    const transactionText = currentElement.text();

    if (isDrugTransaction(transactionText)) {
      return [TransactionTag.DRUG];
    } else if (isGroceryTransaction(transactionText)) {
      return [TransactionTag.GROCERY];
    } else if (isIncomeTransaction(transactionText)) {
      return [TransactionTag.INCOME];
    } else if (isInternetTransaction(transactionText)) {
      return [TransactionTag.INTERNET];
    } else if (isPhoneTransaction(transactionText)) {
      return [TransactionTag.PHONE];
    } else {
      return [TransactionTag.OTHER];
    }
  }

  async readFileContent(filePath): Promise<string> {
    return await readFile(filePath, 'utf8');
  }

  async readHtmlFileContent(fileName): Promise<string> {
    return await this.readFileContent(`data/html/${fileName}.html`);
  }

  async readJsonDataFileAsJson(
    fileName: string,
  ): Promise<MonthlyTransactionReport> {
    return JSON.parse(await this.readFileContent(`data/json/${fileName}.json`));
  }

  resolveCreditFromTransactionCheerio(currentElement: Cheerio): number {
    const creditValue = this.formatCurrencyValueAsNumber(
      currentElement.find('.credit').text(),
    );
    const debitValue = this.formatCurrencyValueAsNumber(
      currentElement.find('.debit').text(),
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
    const filePath = `data/json/${jsonFileName}.json`;
    await ensureFile(filePath);
    return writeFile(
      filePath,
      JSON.stringify(monthlyTransactionReport, null, 2),
    );
  }
}
