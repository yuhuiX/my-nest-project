import * as fs from 'fs';
import * as fsExtra from 'fs-extra';

import { ConvertFileToUtf8Options, WriteFileOptions } from './file.model';
import { MonthlyTransactionReport, TransactionMonthYear } from './app.model';

import { promisify } from 'util';
import { resolve } from 'path';

const readFilePromise = promisify(fs.readFile);
const writeFilePromise = promisify(fs.writeFile);

/**
 * @description convert given file with indicated encoding to 'utf8'
 * @param filePathAbsolute
 * @param originalEncoding
 */
export async function convertFileToUtf8({
  filePathAbsolute,
  originalEncoding,
}: ConvertFileToUtf8Options): Promise<void> {
  const fileContent: string = await readFilePromise(
    filePathAbsolute,
    originalEncoding,
  );

  await writeFilePromise(filePathAbsolute, fileContent, 'utf8');
}

/**
 * @description make sure that a file on given path is already available
 * @param filePath
 */
export async function ensureFile(filePath: string) {
  return fsExtra.ensureFile(filePath);
}

/**
 * @description read JSON file, and return content as JSON object
 * @param fileName
 */
export async function readDbFileAsJson(
  fileName: string,
): Promise<MonthlyTransactionReport> {
  const filePathAbsolute = resolve(
    __dirname,
    '../',
    `data/db/${fileName}.json`,
  );
  return JSON.parse(await readUtf8File(filePathAbsolute));
}

/**
 * @description read given file with encoding 'utf8'
 * @param filePathAbsolute
 */
export function readUtf8File(filePathAbsolute: string): Promise<string> {
  return readFilePromise(filePathAbsolute, 'utf8');
}

export function resolvePreviousReportYearMonth({
  month,
  year,
}: TransactionMonthYear): string {
  if (month === '01') {
    const fileNameMonth = '12';
    const fileNameYear = Number(year) - 1;

    return `${fileNameYear}${fileNameMonth}`;
  } else {
    return (Number(year + month) - 1).toString();
  }
}

/**
 * @description make sure that a file on given path is already available
 */
export async function writeFile({
  filePathAbsolute,
  data,
}: WriteFileOptions): Promise<void> {
  return writeFilePromise(filePathAbsolute, data, 'utf8');
}
