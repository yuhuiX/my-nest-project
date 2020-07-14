import { formatCurrencyValueAsNumber } from './currency.service';

describe('currency service', () => {
  describe('formatCurrencyValueAsNumber()', () => {
    it('should format "-1.000,00" as number -1000', () => {
      expect(formatCurrencyValueAsNumber('-1.000,00')).toBe(-1000);
    });
  });
});
