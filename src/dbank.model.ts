export interface TransactionDate {
  day: string;
  month: string;
  year: string;
}

export interface Transaction {
  bookingDate: TransactionDate;
  credit: number;
  currency: string;
  details: string;
  executionDate: TransactionDate;
  purpose: string;
}
