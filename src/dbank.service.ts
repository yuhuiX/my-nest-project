import * as cheerio from 'cheerio';
import * as fs from 'fs';

import {
  MonthlyTransactionReport,
  MonthlyTransactionReportRequest,
  Transaction,
  TransactionDate,
  TransactionMonthYear,
} from './app.model';
import { ensureFile, writeFile } from 'fs-extra';

import { Injectable } from '@nestjs/common';
import { initTags } from './tagRules.service';
import { promisify } from 'util';

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
    html: string,
    fileNameWithoutExtension: string,
  ): Transaction[] {
    if (fileNameWithoutExtension < '201408') {
      const $: CheerioStatic = cheerio.load(`<table>${html}</table>`);

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
    } else if (fileNameWithoutExtension < '201908') {
      const $: CheerioStatic = cheerio.load(`<table>${html}</table>`);
      const transactionList: Transaction[] = [];

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
            tags: initTags(cheerio(tagHtml).text()),
          });
        }
      });

      return transactionList;
    } else {
      const $: CheerioStatic = cheerio.load(html);
      const transactionList: Transaction[] = [];

      $('table.sortable > tbody') // tbody added by cheerio as valid HTML
        .find('> tr.odd, > tr.even')
        .each((index, element) => {
          const currentElement = $(element);
          const prevElement = $(element).prev();

          if (!currentElement.hasClass('hasSEPADetails')) {
            const detailsText = prevElement.hasClass('hasSEPADetails')
              ? this.resolveDetailsText(currentElement)
              : '';
            const tagHtml =
              currentElement.html() +
              (prevElement.hasClass('hasSEPADetails')
                ? prevElement.html()
                : '');
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
              tags: initTags(cheerio(tagHtml).text()),
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
    const html: string = await this.readHtmlFileContent(
      fileNameWithoutExtension,
    );

    const transactions = this.constructTransactions(
      html,
      fileNameWithoutExtension,
    );

    const monthStartBalance = await this.getMonthStartBalance(
      { month, year },
      html,
    );
    const monthEndBalance = this.getMonthEndBalance(
      { month, year },
      monthStartBalance,
      transactions,
      html,
    );
    return await this.writeMonthlyTransactionReportToFile(
      fileNameWithoutExtension,
      {
        monthEndBalance,
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

  getMonthEndBalance(
    { month, year }: TransactionMonthYear,
    monthStartBalance: number,
    transactions: Transaction[],
    html: string,
  ): number {
    const monthEndBalance: number = this.calculateMonthEndBalance(
      monthStartBalance,
      transactions,
    );
    if (year + month < '201908') {
      return monthEndBalance;
    } else {
      const $: CheerioStatic = cheerio.load(html);

      const monthEndBalanceFromHtml: number = this.formatCurrencyValueAsNumber(
        $('[headers="aB"]')
          .text()
          .trim(),
      );

      if (monthEndBalance !== monthEndBalanceFromHtml) {
        throw Error('UNMATCHED_MONTH_END_BALANCES');
      }

      return monthEndBalance;
    }
  }

  async getMonthStartBalance(
    transactionMonthYear: TransactionMonthYear,
    html: string,
  ): Promise<number> {
    const { month, year } = transactionMonthYear;

    if (year + month < '201908') {
      const previousMonthFileName: string = this.getPreviousFileName(
        transactionMonthYear,
      );

      try {
        const previousMonthReport = await this.readJsonDataFileAsJson(
          previousMonthFileName,
        );
        return previousMonthReport.monthEndBalance;
      } catch {
        return Promise.resolve(0);
      }
    } else {
      const $: CheerioStatic = cheerio.load(html);

      return Promise.resolve(
        this.formatCurrencyValueAsNumber(
          $('[headers="lB"]')
            .text()
            .trim(),
        ),
      );
    }
  }

  getPreviousFileName({ month, year }: TransactionMonthYear): string {
    if (month === '01') {
      const fileNameMonth = '12';
      const fileNameYear = Number(year) - 1;

      return `${fileNameYear}${fileNameMonth}`;
    } else {
      return (Number(year + month) - 1).toString();
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
