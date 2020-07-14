import * as path from 'path';

import {
  MonthlyTransactionReport,
  Transaction,
  TransactionMonthYear,
  WriteMonthlyTransactionReportToFileOptions,
} from './app.model';
import { ParseResult, parse } from 'papaparse';
import { constructYearMonthString, decomposeDate } from './date.service';
import {
  convertFileToUtf8,
  ensureFile,
  readDbFileAsJson,
  readUtf8File,
  resolvePreviousReportYearMonth,
  writeFile,
} from './file.service';
import { debug, error } from './logger.service';
import { formatJsNumber, sumUpTransactionCredits } from './transaction.service';

import { GetMonthStartBalanceOptions } from './dkb.model';
import { Injectable } from '@nestjs/common';
import { formatCurrencyValueAsNumber } from './currency.service';
import { initTags } from './tagRules.service';

@Injectable()
export class DkbService {
  constructDkbDbFileName(monthYear: string): string {
    return `${monthYear}-dkb-check`;
  }

  constructTransactions(csvData: any[][]): Transaction[] {
    return csvData.map(rowData => {
      const details: string = [
        rowData[3],
        rowData[4],
        rowData[5],
        rowData[6],
        rowData[8],
        rowData[9],
        rowData[10],
      ]
        .filter(value => {
          return value; // exclude lines with empty values
        })
        .join('\n');

      return {
        bookingDate: decomposeDate(rowData[0]),
        credit: formatCurrencyValueAsNumber(rowData[7]),
        currency: 'EUR',
        details,
        executionDate: decomposeDate(rowData[1]),
        purpose: rowData[2],
        tags: initTags(details),
      };
    });
  }

  async createMonthlyTransactionReport(
    transactionMonthYear: TransactionMonthYear,
  ): Promise<void> {
    const headerRowIndex = 6;

    const csvContent: string[][] = await this.readParsedCsvContent(
      transactionMonthYear,
    );

    this.validateMetaRows(
      csvContent.filter((value, index) => {
        return index < headerRowIndex;
      }),
    );

    this.validateHeader(csvContent[headerRowIndex]);

    const transactions: Transaction[] = this.constructTransactions(
      csvContent.filter((value, index) => {
        return index > headerRowIndex;
      }),
    );

    const monthEndBalance = this.getMonthEndBalance(csvContent[4][1]);

    const monthStartBalance = await this.getMonthStartBalance({
      monthEndBalance,
      transactionMonthYear,
      transactions,
    });

    const monthlyTransactionReport: MonthlyTransactionReport = {
      monthEndBalance,
      monthStartBalance,
      transactions,
    };
    await this.writeMonthlyTransactionReportToFile({
      fileName: this.constructDkbDbFileName(
        constructYearMonthString(transactionMonthYear),
      ),
      monthlyTransactionReport,
    });
  }

  async getMonthStartBalance({
    monthEndBalance,
    transactionMonthYear,
    transactions,
  }: GetMonthStartBalanceOptions): Promise<number> {
    let previousMonthReport: MonthlyTransactionReport;
    try {
      previousMonthReport = await readDbFileAsJson(
        this.constructDkbDbFileName(
          resolvePreviousReportYearMonth(transactionMonthYear),
        ),
      );
    } catch {
      // default to 0
      return 0;
    }

    const expectedMonthStartBalance: number =
      previousMonthReport.monthEndBalance;
    const acturalMonthStartBalance: number = formatJsNumber(
      monthEndBalance - sumUpTransactionCredits(transactions),
    );

    if (expectedMonthStartBalance !== acturalMonthStartBalance) {
      error(
        `Expect starting balance of ${expectedMonthStartBalance}, but got ${acturalMonthStartBalance}`,
      );
      throw Error('MONTH_START_BALANCE_MISMATCH');
    } else {
      return acturalMonthStartBalance;
    }
  }

  getMonthEndBalance(monthEndBalanceValue: string): number {
    const monthEndBalanceMatches = monthEndBalanceValue.match(
      /^([\d,\.]+?) EUR$/,
    );

    if (monthEndBalanceMatches.length === 2) {
      return formatCurrencyValueAsNumber(monthEndBalanceMatches[1]);
    }

    error(monthEndBalanceValue);
    error(monthEndBalanceMatches);
    throw Error('CANNOT_EXTRACT_MONTH_END_BALANCE');
  }

  async readParsedCsvContent(
    transactionMonthYear: TransactionMonthYear,
  ): Promise<string[][]> {
    const yearMonthString = constructYearMonthString(transactionMonthYear);
    const filePathAbsolute = path.resolve(
      __dirname,
      '../', // destination JS files are built in ./dist folder
      `data/csv/${yearMonthString}-giro.csv`,
    );
    let csvContent: ParseResult = parse(await readUtf8File(filePathAbsolute));

    const encodingReferenceValueMatched: boolean =
      csvContent.data[6][3] === 'Auftraggeber / Begünstigter';
    if (!encodingReferenceValueMatched) {
      await convertFileToUtf8({
        filePathAbsolute,
        originalEncoding: 'latin1',
      });

      csvContent = parse(await readUtf8File(filePathAbsolute));
    }

    if (csvContent.errors.length > 0) {
      error(csvContent.errors);
      throw Error('CSV_PARSE_ERROR');
    }

    return csvContent.data;
  }

  validateHeader(headerRowData: string[]): void {
    const expectedHeaderRowData = [
      'Buchungstag',
      'Wertstellung',
      'Buchungstext',
      'Auftraggeber / Begünstigter',
      'Verwendungszweck',
      'Kontonummer',
      'BLZ',
      'Betrag (EUR)',
      'Gläubiger-ID',
      'Mandatsreferenz',
      'Kundenreferenz',
    ];

    const headerErrorMessages = [];

    headerRowData.forEach((headerRowValue, index) => {
      // papaparse adds an additional empty column with value ''
      const expectedHeaderRowValue = expectedHeaderRowData[index] || '';
      if (headerRowValue !== expectedHeaderRowValue) {
        headerErrorMessages.push(
          `Expect "${expectedHeaderRowValue}" at position ${index}, but got "${headerRowValue}"`,
        );
      }
    });

    if (headerErrorMessages.length > 0) {
      error(headerErrorMessages.join('; '));
      throw Error('UNEXPECTED_DKB_HEADER');
    }
  }

  validateMetaRows(metaRowsData: string[][]): void {
    const expectedMetaRowsStartingData = [
      'Kontonummer:',
      '',
      'Von:',
      'Bis:',
      'Kontostand vom ',
      '',
    ];

    const metaErrorMessages = [];
    metaRowsData.forEach((metaRowData, index) => {
      const metaRowFirstValue: string = metaRowData[0];
      const expectedMetaRowStartingData: string =
        expectedMetaRowsStartingData[index];
      if (
        !new RegExp(`^${expectedMetaRowStartingData}`).test(metaRowFirstValue)
      ) {
        metaErrorMessages.push(
          `Expect "${expectedMetaRowStartingData}" at position ${index}, but got "${metaRowFirstValue}"`,
        );
      }
    });

    if (metaErrorMessages.length > 0) {
      error(metaErrorMessages.join('; '));
      throw Error('UNEXPECTED_DKB_META');
    }
  }

  async writeMonthlyTransactionReportToFile({
    fileName,
    monthlyTransactionReport,
  }: WriteMonthlyTransactionReportToFileOptions): Promise<void> {
    const filePathAbsolute = path.resolve(
      __dirname,
      '../', // destination JS files are built in ./dist folder
      `data/db/${fileName}.json`,
    );
    await ensureFile(filePathAbsolute);
    await writeFile({
      filePathAbsolute,
      data: JSON.stringify(monthlyTransactionReport, null, 2),
    });
  }
}
