import { Transaction } from './app.model';

/**
 * @description format JS number with 2 decimals
 * @param originalNumber
 */
export function formatJsNumber(originalNumber: number) {
  return Number(originalNumber.toFixed(2));
}

/**
 * @description calculate the sum of credits given by the list of transactions
 * @param transactions
 */
export function sumUpTransactionCredits(transactions: Transaction[]): number {
  return transactions.reduce((balance, { credit }) => {
    return formatJsNumber(balance + credit);
  }, 0);
}
