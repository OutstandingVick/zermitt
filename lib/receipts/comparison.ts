/**
 * Fee-comparison figures — ESTIMATES, in one place.
 *
 * Source: World Bank, Remittance Prices Worldwide (https://remittanceprices.worldbank.org).
 * The global average cost of sending $200 was ~6.2–6.5% in recent RPW
 * quarterly reports, and bank transfers commonly take 1–5 business days.
 * These are rounded planning figures, not a quote from any provider;
 * cited in the README.
 */
export const COMPARISON = {
  /** Typical all-in cost of a bank/remittance service, as a fraction. */
  typicalFeeRate: 0.062,
  /** Typical settlement time in days. */
  typicalDays: 3,
  source: "World Bank Remittance Prices Worldwide (global average, ~6.2% on $200)",
};

/**
 * `seconds` is optional: receipts don't record a measured settlement time,
 * so without one the sentence says "in seconds" rather than inventing a number.
 */
export function feeComparison(amountUsd: number, feeUsd: number, seconds?: number) {
  const typicalFee = amountUsd * COMPARISON.typicalFeeRate;
  const speed = seconds === undefined ? "in seconds" : `in ~${seconds}s`;
  return {
    sentUsd: amountUsd,
    feeUsd,
    seconds,
    typicalFeeUsd: typicalFee,
    typicalDays: COMPARISON.typicalDays,
    sentence:
      `Sent $${amountUsd.toFixed(2)} for $${feeUsd.toFixed(4)} ${speed}, ` +
      `versus about $${typicalFee.toFixed(2)} over ~${COMPARISON.typicalDays} days ` +
      `with a typical bank or remittance service (estimate).`,
  };
}
