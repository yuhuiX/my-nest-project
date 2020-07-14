import { TransactionDate, TransactionMonthYear } from './app.model';
import { constructYearMonthString, decomposeDate } from './date.service';

describe('date service', () => {
  describe('constructYearMonthString()', () => {
    [
      {
        spec:
          'if month does not contain leading 0 for Jan - Sep, the leading 0 should be added',
        year: '2019',
        month: '3',
        expectedOutput: '201903',
      },
      {
        spec:
          'if month already contains leading 0 for Jan - Sep, no leading 0 should be added',
        year: '2019',
        month: '03',
        expectedOutput: '201903',
      },
      {
        spec: 'for months Oct - Dec, the leading 0 should not be added',
        year: '2019',
        month: '11',
        expectedOutput: '201911',
      },
    ].forEach(({ spec, year, month, expectedOutput }) => {
      it(spec, () => {
        const transactionMonthYear: TransactionMonthYear = { year, month };
        expect(constructYearMonthString(transactionMonthYear)).toEqual(
          expectedOutput,
        );
      });
    });
  });

  describe('decomposeDate()', () => {
    it('from "20.08.2019", should recognize "20" as day, "08" as month, and "2019" as year', () => {
      const expectedOutput: TransactionDate = {
        day: '20',
        month: '08',
        year: '2019',
      };

      expect(decomposeDate('20.08.2019')).toEqual(expectedOutput);
    });
  });
});
