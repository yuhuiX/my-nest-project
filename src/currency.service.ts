/**
 * @description format given currency number from data as number
 * @param value value string
 */
export function formatCurrencyValueAsNumber(value: string): number {
  return Number(
    value
      .replace(/[^\d\-\.,]/g, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  );
}
