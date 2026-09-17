'use client';

/* The product ledger lives in Supabase, and money moves by bank transfer
   against the invoices raised off these rows. These hooks deliberately expose
   only the signed-in party's own rows, which are already constrained by the
   payments migration's RLS policies. */

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Statement = { amountCents: number; status: 'pending' | 'succeeded' | 'failed' | 'paid'; paidAt: string | null };

function useRows(table: 'charges' | 'payouts') {
  const [state, setState] = useState<{ ready: boolean; rows: Statement[] }>({ ready: false, rows: [] });
  useEffect(() => {
    let live = true;
    void supabase().from(table).select('amount_cents, status, paid_at').order('created_at', { ascending: false }).then(({ data }) => {
      if (!live) return;
      setState({ ready: true, rows: (data ?? []).map((row) => ({ amountCents: Number(row.amount_cents), status: row.status as Statement['status'], paidAt: row.paid_at })) });
    });
    return () => { live = false; };
  }, [table]);
  return state;
}

export function useAdvertiserStatements() {
  const state = useRows('charges');
  return { ...state, paidCents: state.rows.filter((row) => row.status === 'succeeded').reduce((total, row) => total + row.amountCents, 0) };
}

export function useShopStatements() {
  const state = useRows('payouts');
  return { ...state, paidCents: state.rows.filter((row) => row.status === 'paid').reduce((total, row) => total + row.amountCents, 0) };
}
