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

export interface TransactionDate extends TransactionMonthYear {
  day: string;
}

export interface TransactionMonthYear {
  month: string;
  year: string;
}

export enum TransactionTag {
  BROADCAST = 'BROADCAST',
  CINEMA = 'CINEMA',
  DRUG = 'DRUG',
  GROCERY = 'GROCERY',
  INCOME = 'INCOME',
  INTERNET = 'INTERNET',
  OTHER = 'OTHER',
  PHONE = 'PHONE',
  PUBLIC_TRANSPORT = 'PUBLIC_TRANSPORT',
  RENT = 'RENT',
  RESTAURANT = 'RESTAURANT',
  WITHDRAWAL = 'WITHDRAWAL',
}
