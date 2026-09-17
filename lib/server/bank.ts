/* Where advertisers send the money. Server-only.
 *
 * Nothing here is invented: every field comes from an environment variable,
 * and `bankConfigured()` is false until they are all set. An invoice is still
 * raised without them -- the debt is real either way -- but it is not mailed,
 * because an invoice that does not say where to pay is worse than no invoice.
 * SETUP.md lists the variables. */

export const BANK = {
  /** The name on the account, which is what a transfer must be addressed to. */
  accountName: process.env.BANK_ACCOUNT_NAME ?? '',
  bankName: process.env.BANK_NAME ?? '',
  routingNumber: process.env.BANK_ROUTING_NUMBER ?? '',
  accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? '',
  /** Where a cheque would go, for the advertisers who still send one. */
  address: process.env.BANK_ADDRESS ?? '',
};

export type BankDetails = typeof BANK;

export function bankConfigured() {
  return Boolean(BANK.accountName && BANK.routingNumber && BANK.accountNumber);
}
