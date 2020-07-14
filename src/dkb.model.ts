import { Transaction, TransactionMonthYear } from './app.model';

export interface GetMonthStartBalanceOptions {
  monthEndBalance: number;
  transactionMonthYear: TransactionMonthYear;
  transactions: Transaction[];
}
