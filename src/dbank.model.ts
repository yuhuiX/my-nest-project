export interface MonthlyTransactionReport {
  monthEndBalance: number;
  monthStartBalance: number;
  transactions: Transaction[];
}

export class MonthlyTransactionReportRequest {
  readonly month: string;
  readonly year: string;
}

export interface Transaction {
  bookingDate: TransactionDate;
  credit: number;
  currency: string;
  details: string;
  executionDate: TransactionDate;
  purpose: string;
  tags: string[];
}

export interface TransactionDate {
  day: string;
  month: string;
  year: string;
}

export enum TransactionTag {
  DRUG = 'DRUG',
  GROCERY = 'GROCERY',
  INCOME = 'INCOME',
  INTERNET = 'INTERNET',
  PHONE = 'PHONE',
  OTHER = 'OTHER',
  RENT = 'RENT',
}
