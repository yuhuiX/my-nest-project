import { TransactionDate, TransactionMonthYear } from './app.model';

/**
 * @description from given year and month values, construct the year-month string used in source files
 * @param year
 * @param month
 */
export function constructYearMonthString({
  year,
  month,
}: TransactionMonthYear): string {
  const monthString = ('0' + month).slice(-2);
  return `${year}${monthString}`;
}

/**
 * @description decompose given date string as date fields
 * @param date date string in DD.MM.YYYY
 */
export function decomposeDate(date: string): TransactionDate {
  const dateParts = date.split('.');

  return {
    day: dateParts[0],
    month: dateParts[1],
    year: dateParts[2],
  };
}
