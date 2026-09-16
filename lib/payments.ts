'use client';

import { supabase } from '@/lib/supabase';

export async function beginConnectOnboarding() {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in first.');
  const response = await fetch('/api/stripe/connect', { method: 'POST', headers: { authorization: `Bearer ${token}` } });
  const body = (await response.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!response.ok || !body.url) throw new Error(body.message ?? 'Could not start Stripe onboarding.');
  window.location.assign(body.url);
}
