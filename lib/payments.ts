'use client';

/* Where a shop wants paying.
 *
 * Stripe Connect is shelved, so there is no hosted onboarding to redirect to
 * and no account to wait on: a shop types its bank details once and we push an
 * ACH credit to them. That means this file handles the one genuinely sensitive
 * form in the product, so:
 *
 *   - the full account number goes in and never comes back out. The row's
 *     `account_number` column is revoked from the `authenticated` role, so the
 *     read below asks for the last four and the holder's name and nothing else.
 *   - nothing is kept in this browser. No cache, no local storage, no state
 *     that survives the component.
 *   - the details are checked here only well enough to catch a typo. What they
 *     actually are is settled when the first transfer either lands or bounces.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type PayoutAccount = {
  accountHolder: string;
  last4: string;
  accountType: 'checking' | 'savings';
};

export type BankInput = {
  accountHolder: string;
  routingNumber: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
};

/** ABA routing numbers are nine digits with a checksum. Catching a mistyped
    one here saves a failed transfer and a fortnight. */
export function routingLooksReal(routing: string) {
  const digits = routing.replace(/\D/g, '');
  if (digits.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 3) {
    sum += 3 * Number(digits[i]) + 7 * Number(digits[i + 1]) + Number(digits[i + 2]);
  }
  return sum % 10 === 0;
}

async function myShopId(): Promise<string | null> {
  const db = supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data } = await db
    .from('shops')
    .select('id')
    .eq('owner_id', auth.user.id)
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

export async function savePayoutAccount(
  input: BankInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const holder = input.accountHolder.trim();
  const routing = input.routingNumber.replace(/\D/g, '');
  const account = input.accountNumber.replace(/\D/g, '');

  if (holder.length < 2) return { ok: false, message: 'Whose account is it?' };
  if (!routingLooksReal(routing)) {
    return { ok: false, message: 'That routing number does not look right. It is nine digits.' };
  }
  if (account.length < 4 || account.length > 17) {
    return { ok: false, message: 'That account number does not look right.' };
  }

  const shopId = await myShopId();
  if (!shopId) return { ok: false, message: 'Only a shop owner can set up payouts.' };

  const { error } = await supabase()
    .from('payout_accounts')
    .upsert(
      {
        shop_id: shopId,
        account_holder: holder,
        routing_number: routing,
        account_number: account,
        account_last4: account.slice(-4),
        account_type: input.accountType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shop_id' },
    );
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** What we can say back: who it is paid to, and the last four. Never more. */
export function usePayoutAccount(): { ready: boolean; account: PayoutAccount | null } {
  const [state, setState] = useState<{ ready: boolean; account: PayoutAccount | null }>({
    ready: false,
    account: null,
  });

  useEffect(() => {
    let live = true;
    void supabase()
      .from('payout_accounts')
      .select('account_holder, account_last4, account_type')
      .maybeSingle()
      .then(({ data }) => {
        if (!live) return;
        setState({
          ready: true,
          account: data
            ? {
                accountHolder: data.account_holder as string,
                last4: data.account_last4 as string,
                accountType: data.account_type as 'checking' | 'savings',
              }
            : null,
        });
      });
    return () => {
      live = false;
    };
  }, []);

  return state;
}
