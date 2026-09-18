'use client';

/* Who is signed in, and which side of the board they are on.
 *
 * Sign-in is a magic link: an email address, a mail, a click. There is no
 * password to forget. The side (advertiser or shop) is chosen once on the
 * dashboard, kept on the account row, and never changes: a shop is a shop and
 * an advertiser is an advertiser. Someone who needs both uses two emails.
 *
 * `useAccount()` keeps the shape the dashboards already read, with `user`
 * added: `ready` is false through the first paint so the prerender matches,
 * `kind` is null until a side is chosen, `user` is null when signed out. */

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { reloadBoard, starterBoard } from '@/lib/board';
import { reloadCampaigns } from '@/lib/campaigns';

export type AccountKind = 'advertiser' | 'shop';

export const ACCOUNTS: {
  id: AccountKind;
  label: string;
  blurb: string;
  action: string;
}[] = [
  {
    id: 'advertiser',
    label: 'I want to advertise',
    blurb:
      'Buy minutes on the boards near your customers. Price a week, drop in your artwork, and see what it did once it ran.',
    action: 'Open the campaign builder',
  },
  {
    id: 'shop',
    label: 'I run a shop',
    blurb:
      'Design the board your customers read, decide where on it ads may sit, approve every one of them, and see what the screen pays you.',
    action: 'Open your board',
  },
];

export type AccountUser = { id: string; email: string };

type State = { ready: boolean; kind: AccountKind | null; user: AccountUser | null };

let state: State = { ready: false, kind: null, user: null };
let started = false;
const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

function userOf(session: Session | null): AccountUser | null {
  const user: User | undefined = session?.user;
  return user ? { id: user.id, email: user.email ?? '' } : null;
}

async function loadRole(userId: string): Promise<AccountKind | null> {
  const { data } = await supabase().from('accounts').select('role').eq('id', userId).maybeSingle();
  return (data?.role as AccountKind | null) ?? null;
}

async function apply(session: Session | null) {
  const user = userOf(session);
  const kind = user ? await loadRole(user.id) : null;
  state = { ready: true, kind, user };
  announce();
  /* The other stores cache per session; a new session means new rows. */
  reloadBoard();
  reloadCampaigns();
}

/* One subscription per tab, started by the first hook that mounts. */
function start() {
  if (started) return;
  started = true;
  const auth = supabase().auth;
  auth.getSession().then(({ data }) => apply(data.session));
  auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return;
    void apply(session);
  });
}

/** Send the magic link. The page the link opens is /dashboard. */
export async function signIn(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Choose a side, once. An account is a shop or an advertiser for good; the
    row is only written while it has no role, and the database policy in
    supabase/migrations refuses the change after that too. A shop owner gets
    a shop and a starter board with the choice, so the editor opens on
    something. */
export async function setAccount(kind: AccountKind) {
  const user = state.user;
  if (!user || state.kind) return;
  const db = supabase();
  await db.from('accounts').update({ role: kind }).eq('id', user.id);

  if (kind === 'shop') {
    const { data: existing } = await db.from('shops').select('id').eq('owner_id', user.id).limit(1);
    if (!existing?.length) {
      const board = starterBoard();
      /* The row is created nameless. It used to be seeded with the starter
         board's shop name, which is why the first real shop that ever signed
         up was called Bao Pao Wow in the database: the demo leaked into their
         record. Onboarding names it, a screen later, from what they type.
         The board itself still opens on the example, which is the point of it
         -- an editor that opens on an empty grid teaches nobody. */
      const { data: shop } = await db
        .from('shops')
        .insert({ owner_id: user.id, name: '', ad_placement: board.adPlacement })
        .select('id')
        .single();
      if (shop) await db.from('boards').insert({ shop_id: shop.id, board });
    }
  }

  state = { ...state, kind };
  announce();
  reloadBoard();
  reloadCampaigns();
}

export async function clearAccount() {
  await supabase().auth.signOut();
  state = { ready: true, kind: null, user: null };
  announce();
}

export function useAccount(): State {
  const [snapshot, setSnapshot] = useState<State>({ ready: false, kind: null, user: null });

  useEffect(() => {
    start();
    const sync = () => setSnapshot(state);
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return snapshot;
}
