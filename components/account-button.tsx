'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, useNav, usePath } from '@/components/nav';
import { LayoutDashboard, LogOut, User } from 'lucide-react';
import { signOut, useSession } from '@/lib/auth';

/* The header's right-hand slot. Server-rendered as a plain "Sign in" link, then
   swapped for the account menu once the stored session is read. */
export function AccountButton() {
  const { ready, session } = useSession();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const router = useNav();
  const pathname = usePath();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (!ready || !session) {
    const next = pathname && pathname !== '/signin' ? `?next=${encodeURIComponent(pathname)}` : '';
    return (
      <Link className="signin-link" href={`/signin${next}`}>
        <User size={15} /> Sign in
      </Link>
    );
  }

  return (
    <div className="account" ref={wrap}>
      <button
        type="button"
        className="account-chip"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-avatar" aria-hidden="true">
          {session.username.slice(0, 1).toUpperCase()}
        </span>
        {session.username}
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <Link href="/dashboard" role="menuitem" onClick={() => setOpen(false)}>
            <LayoutDashboard size={15} /> Dashboard
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              signOut();
              setOpen(false);
              router.push('/');
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
