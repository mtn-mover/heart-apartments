/**
 * All amounts in the booking domain are integers in Rappen.
 * This is the single formatter for user-facing CHF output (UI + emails),
 * so there is exactly one place that decides how money looks.
 */
const formatter = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
});

export function chf(rappen: number): string {
  return formatter.format(rappen / 100);
}
